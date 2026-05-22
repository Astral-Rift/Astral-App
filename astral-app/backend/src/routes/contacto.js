import nodemailer from 'nodemailer';
import 'dotenv/config';

const transporter = nodemailer.createTransport({
    host:   'smtp.gmail.com',
    port:   465,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export default async function contactoRoutes(fastify) {

    fastify.post('/api/contacto', {
        schema: {
            body: {
                type: 'object',
                required: ['nombre', 'email', 'mensaje'],
                properties: {
                    nombre:  { type: 'string', minLength: 1, maxLength: 100 },
                    email:   { type: 'string', format: 'email' },
                    mensaje: { type: 'string', minLength: 1, maxLength: 2000 },
                }
            }
        }
    }, async (request, reply) => {
        const { nombre, email, mensaje } = request.body;

        await transporter.sendMail({
            from:    `"Astral App" <${process.env.SMTP_USER}>`,
            to:      process.env.SMTP_TO,
            subject: `[Contacto] Mensaje de ${nombre}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #1677ff;">Nuevo mensaje de contacto</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #666; width: 80px;">Nombre</td>
                            <td style="padding: 8px 0; color: #222; font-weight: 600;">${nombre}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #666;">Email</td>
                            <td style="padding: 8px 0; color: #1677ff;">${email}</td>
                        </tr>
                    </table>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />
                    <p style="color: #666; margin-bottom: 8px;">Mensaje:</p>
                    <p style="color: #222; white-space: pre-wrap; background: #f5f5f5; padding: 12px; border-radius: 6px;">${mensaje}</p>
                </div>
            `,
            replyTo: email,
        });

        reply.send({ ok: true });
    });
}
