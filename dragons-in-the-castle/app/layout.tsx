import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Dragons in the Castle',description:'A game of secrets, stolen gold, and suspicious friends.',manifest:'/manifest.webmanifest'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
