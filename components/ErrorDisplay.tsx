'use client';

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

// Define props for the component
interface ErrorDisplayProps {
  message: string;
  showBackButton?: boolean;
}

// Placeholder Error Component - now a client component
export function ErrorDisplay({ message, showBackButton = true }: ErrorDisplayProps) {
  return (
    <div className="container mx-auto px-4 py-8 text-center">
      <Alert variant="destructive" className="mb-4 max-w-md mx-auto">
        <AlertTitle>Error</AlertTitle> {/* Generic title */}
        <AlertDescription>{message}</AlertDescription>
      </Alert>
      {showBackButton && (
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => window.history.back()} // Client-side handler works here
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      )}
    </div>
  );
} 