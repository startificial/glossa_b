import React from 'react';
import { useParams } from 'wouter';
import DocumentViewer from '@/components/template-management/DocumentViewer';

export default function DocumentViewPage() {
  // Document ID is passed in the URL and picked up by the DocumentViewer component
  return <DocumentViewer />;
}