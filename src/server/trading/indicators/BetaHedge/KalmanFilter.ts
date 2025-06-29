/**
 * Kalman Filter для адаптивной оценки коэффициента beta
 * Используется для динамического отслеживания корреляции между двумя активами
 */
export class KalmanFilter {
  private x: number; // Текущая оценка состояния (beta)
  private P: number; // Ковариация ошибки оценки
  private Q: number; // Шум процесса
  private R: number; // Шум измерения

  constructor(
    initialState: number = 1.0,
    initialCovariance: number = 1.0,
    processNoise: number = 1e-5,
    measurementNoise: number = 1e-3,
  ) {
    this.x = initialState;
    this.P = initialCovariance;
    this.Q = processNoise;
    this.R = measurementNoise;
  }

  /**
   * Обновление фильтра с новым измерением
   * @param measurement - новое измерение (отношение доходностей)
   * @param input - входное значение (доходность независимой переменной)
   * @returns обновленная оценка beta
   */
  public update(measurement: number, input: number): number {
    // Предсказание (predict step)
    // x_pred = x (предполагаем, что beta не изменяется)
    // P_pred = P + Q
    const P_pred = this.P + this.Q;

    // Обновление (update step)
    // Ожидаемое измерение: h = input * x
    const h = input * this.x;

    // Инновация (innovation)
    const y = measurement - h;

    // Ковариация инновации
    const S = input * P_pred * input + this.R;

    // Коэффициент усиления Кальмана
    const K = (P_pred * input) / S;

    // Обновление оценки состояния
    this.x = this.x + K * y;

    // Обновление ковариации ошибки
    this.P = (1 - K * input) * P_pred;

    return this.x;
  }

  /**
   * Получить текущую оценку beta
   */
  public getState(): number {
    return this.x;
  }

  /**
   * Получить текущую ковариацию ошибки
   */
  public getCovariance(): number {
    return this.P;
  }

  /**
   * Сброс фильтра к начальным условиям
   */
  public reset(initialState: number = 1.0, initialCovariance: number = 1.0): void {
    this.x = initialState;
    this.P = initialCovariance;
  }
}
