import axios from 'axios';

export const http = axios.create({
    baseURL: __API_URL__,
    timeout: 10000,
});

http.interceptors.response.use(
    (response) => {
        return response.data;
    },
    (error) => {
        const status = error?.response?.status;
        const message = error?.response?.data?.message;

        switch (status) {
            // Bad request
            case 400:
                console.error(message);
                break;
            // Not found
            case 404:
                console.error('Request address does not exist');
                break;
            // Validation failed
            case 422:
                console.error('Form validation failed');
                break;
            // Other errors
            default:
                console.error(message ?? 'Server error, please try again later');
        }
        return Promise.reject(error);
    }
);
