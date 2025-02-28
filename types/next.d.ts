import { NextPage } from 'next';
import { AppProps } from 'next/app';
import { ReactElement, ReactNode } from 'react';

// Define custom types for Next.js pages with layouts
export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode;
};

// Define custom types for dynamic route parameters
declare module 'next' {
  export interface PageProps {
    params?: any;
    searchParams?: any;
  }
  
  export interface LayoutProps {
    params?: any;
    children?: ReactNode;
    modal?: ReactNode;
  }
}

// Define custom types for API routes
declare module 'next/server' {
  export interface RouteHandlerContext {
    params: Record<string, string | string[]>;
  }
} 