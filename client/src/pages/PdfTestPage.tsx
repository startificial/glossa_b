/**
 * PDF Test Page
 * 
 * A simple page to test the PDF generation functionality
 */
import { PdfTest } from '@/components/documentation/pdf-test';

export default function PdfTestPage() {
  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">PDF Generator Test</h1>
      <p className="mb-6 text-muted-foreground">
        This page allows you to test the direct PDF generation functionality using our new route.
        Enter a project ID and select a document type to generate a PDF.
      </p>
      <PdfTest />
    </div>
  );
}