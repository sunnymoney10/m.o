import type {Metadata,Viewport} from 'next';
import './globals.css';
export const metadata:Metadata={title:'m.o — Make it out the groupchat',description:'One link for the plan, the votes, and who’s bringing what. What’s your mo?',icons:{icon:'/favicon.svg'}};
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#f6eee4'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><head><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Outfit:wght@400;500;600;700;800;900&display=swap"/></head><body>{children}</body></html>}
