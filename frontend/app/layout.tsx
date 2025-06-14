import './globals.css';
import '@/node_modules/react-modal-video/scss/modal-video.scss';
import Navbar from './components/Navbar/index';
import Footer from './components/Footer/index';
import Link from 'next/link';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
          <Link href="/" className="mr-4">Home</Link>
          <Link href="/chatbot">Chatbot</Link>
        {children}
      </body>
    </html>
  );
}