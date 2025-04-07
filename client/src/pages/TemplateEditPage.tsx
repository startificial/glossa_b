import React from 'react';
import { useParams } from 'wouter';
import TemplateDesigner from '@/components/template-management/TemplateDesigner';

export default function TemplateEditPage() {
  // Template ID is passed in the URL and picked up by the TemplateDesigner component
  return <TemplateDesigner />;
}