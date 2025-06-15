#!/usr/bin/env python3
# coding: utf-8
"""
CLI + worker-режим PearsonCorrelation
  $ python PearsonCorrelation.py   → worker (stdin/stdout)
  $ python PearsonCorrelation.py correlation_by_prices '{"candlesA":[…] …}'
"""
import json, sys, math, numpy as np
# ----------  существующие вспомогательные функции -----------
def _prices_from_candles(candles):           # … (как было)
    return [ float(c['close']) for c in candles ]

def _get_log_returns(prices):
    out = []
    for i in range(1, len(prices)):
        p, q = prices[i-1], prices[i]
        out.append(math.log(q/p) if p>0 and q>0 else 0.0)
    return out

def _corr(x, y):
    if len(x) < 2 or len(y) < 2: return 0.0
    return float(np.corrcoef(x[:len(y)], y[:len(x)])[0, 1])

# ----------  публичные API-функции -----------
def correlation_by_prices(candlesA, candlesB):
    return _corr(_prices_from_candles(candlesA), _prices_from_candles(candlesB))

def correlation_by_returns(candlesA, candlesB):
    n = min(len(candlesA), len(candlesB))
    if n < 2: return 0.0
    rA = _get_log_returns(_prices_from_candles(candlesA[:n]))
    rB = _get_log_returns(_prices_from_candles(candlesB[:n]))
    return _corr(rA, rB)

def rolling_correlation_by_prices(candlesA, candlesB, window=100):
    n = min(len(candlesA), len(candlesB))
    if n < window: return []
    out = []
    for i in range(window, n):
        out.append({
            "timestamp": int(candlesA[i]["openTime"]),
            "value": correlation_by_prices(candlesA[i-window:i], candlesB[i-window:i])
        })
    return out

def rolling_correlation_by_returns(candlesA, candlesB, window=100):
    n = min(len(candlesA), len(candlesB))
    if n < window+1: return []
    out=[]
    for i in range(window, n-1):
        out.append({
            "timestamp": int(candlesA[i+1]["openTime"]),
            "value": correlation_by_returns(candlesA[i-window:i+1], candlesB[i-window:i+1])
        })
    return out

# ----------  диспетчер -----------
_FUNCS = {
    "correlation_by_prices": correlation_by_prices,
    "correlation_by_returns": correlation_by_returns,
    "rolling_correlation_by_prices": rolling_correlation_by_prices,
    "rolling_correlation_by_returns": rolling_correlation_by_returns,
}

def _dispatch(req):
    f = _FUNCS[req["func"]]
    payload = req.get("payload", {})
    return f(**payload)

# ----------  CLI  /  WORKER -----------
def _write(obj):  sys.stdout.write(json.dumps(obj)+'\n'); sys.stdout.flush()

if __name__ == "__main__":
    if len(sys.argv) > 2:
        # однократный CLI-вызов
        func = sys.argv[1]
        payload = json.loads(sys.argv[2])
        _write(_FUNCS[func](**payload))
    else:
        # режим воркера
        for line in sys.stdin:
            try:
                req = json.loads(line)
                _write({"id": req["id"], "result": _dispatch(req)})
            except Exception as e:
                _write({"id": req.get("id"), "error": str(e)})
