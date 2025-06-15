import sys
import json
import math
from typing import List

import numpy as np
import statsmodels.api as sm


def calculate_half_life(prices_a: List[float], prices_b: List[float]) -> float:
    """Calculate half-life of the spread between two price series using statsmodels.

    1. Take the log-prices.
    2. Estimate hedge ratio β via OLS: logA ~ β·logB.
    3. Compute spread: logA − β·logB.
    4. Fit AR(1): spread[t] = α + φ·spread[t−1] + ε_t.
    5. Half-life = −ln(2)/ln(φ).

    If φ is not in (0, 1), returns math.inf.
    """

    # Ensure equal length and minimum size
    n = min(len(prices_a), len(prices_b))
    if n < 3:
        raise ValueError("Series must be the same length and at least 3 observations long.")

    pa = np.asarray(prices_a[-n:], dtype=float)
    pb = np.asarray(prices_b[-n:], dtype=float)

    # 1. Log-prices
    log_a = np.log(pa)
    log_b = np.log(pb)

    # 2. Hedge ratio β via OLS (without intercept)
    beta_model = sm.OLS(log_a, log_b[:, None]).fit()
    beta = beta_model.params[0]

    # 3. Spread
    spread = log_a - beta * log_b

    # 4. AR(1) on spread
    #   spread[1:] = α + φ * spread[:-1]
    y = spread[1:]
    x = sm.add_constant(spread[:-1])
    ar_model = sm.OLS(y, x).fit()
    phi = ar_model.params[1] if ar_model.params.size > 1 else math.nan

    # 5. Half-life
    if phi <= 0 or phi >= 1 or math.isnan(phi):
        return math.inf

    return math.log(2) / -math.log(phi)


# ------------ PUBLIC API --------------

def calculate(pricesA, pricesB):
    return calculate_half_life(pricesA, pricesB)

_FUNCS = {
    "calculate": calculate,
}


def _dispatch(req):
    func = _FUNCS[req["func"]]
    payload = req.get("payload", {})
    return func(**payload)


# ------------- CLI / WORKER ------------

def _write(obj):
    sys.stdout.write(json.dumps(obj) + "\n")
    sys.stdout.flush()


if __name__ == "__main__":
    if len(sys.argv) > 2:
        # CLI one-shot: python HalfLife.py calculate '{"pricesA": [...], "pricesB": [...]}'
        func = sys.argv[1]
        payload = json.loads(sys.argv[2])
        _write(_FUNCS[func](**payload))
    else:
        # Worker mode
        for line in sys.stdin:
            try:
                if not line.strip():
                    continue
                req = json.loads(line)
                _write({"id": req["id"], "result": _dispatch(req)})
            except Exception as e:
                _write({"id": req.get("id"), "error": str(e)})
