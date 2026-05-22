import './globals.css';

export const metadata = {
    title: 'Astral App — Game Servers',
    description: 'Hosting de servidores de juegos',
    icons: {
        icon: '/favicon.svg',
    },
};

export default function RootLayout({ children }) {
    return (
        <html lang="es">
            <body className="bg-gray-950 text-gray-100 min-h-screen">
                {children}
            </body>
        </html>
    );
}
