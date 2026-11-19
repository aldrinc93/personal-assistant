import { Hono } from 'hono';
const app = new Hono();
app.get('/', (c) => {
    return c.text('Hello hello!');
});
app.get('/marco', (c) => {
    return c.text('polo');
});
export default app;
