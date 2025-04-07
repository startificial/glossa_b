import React from 'react';
import { useParams } from 'wouter';
import DocumentGenerator from '@/components/template-management/DocumentGenerator';

export default function DocumentGeneratePage() {
  // Template ID and Project ID are passed in the URL and picked up by the DocumentGenerator component
  return <DocumentGenerator />;
}