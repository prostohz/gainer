import axios, { AxiosError } from 'axios';

const http = axios.create({
  baseURL: `http://localhost:${import.meta.env.VITE_SERVER_PORT}`,
});

// Перехватчик ответов для обработки ошибок
http.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Обработка ошибок в зависимости от статуса
    if (error.response) {
      // Ошибка с ответом от сервера
      const { status, data } = error.response;

      switch (status) {
        case 401:
          console.error('Ошибка авторизации:', data);
          // Здесь можно добавить редирект на страницу логина или другую логику
          break;
        case 403:
          console.error('Доступ запрещен:', data);
          break;
        case 404:
          console.error('Ресурс не найден:', data);
          break;
        case 500:
          console.error('Ошибка сервера:', data);
          break;
        default:
          console.error(`Ошибка с кодом ${status}:`, data);
      }
    } else if (error.request) {
      // Запрос был сделан, но ответ не получен
      console.error('Нет ответа от сервера:', error.request);
    } else {
      // Ошибка при настройке запроса
      console.error('Ошибка запроса:', error.message);
    }

    // Возвращаем отклоненный промис, чтобы код, вызывающий запрос,
    // мог также обработать ошибку
    return Promise.reject(error);
  },
);

export { http };
