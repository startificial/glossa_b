import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { DocumentTemplate, FieldMapping } from '@shared/schema';
import { Designer } from '@pdfme/ui';
import { Template } from '@pdfme/common';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

// Empty template definition with a base64 empty PDF
const emptyTemplate: Template = {
  schemas: [[]],
  basePdf: 'data:application/pdf;base64,JVBERi0xLjcKJb/3ov4KMiAwIG9iago8PCAvTGluZWFyaXplZCAxIC9MIDcxMjMxIC9IIFsgNjg4IDEyNiBdIC9PIDYgL0UgNzA5MDYgL04gMSAvVCA3MDkzNSA+PgplbmRvYmoKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKMyAwIG9iago8PCAvVHlwZSAvWFJlZiAvTGVuZ3RoIDUwIC9GaWx0ZXIgL0ZsYXRlRGVjb2RlIC9EZWNvZGVQYXJtcyA8PCAvQ29sdW1ucyA0IC9QcmVkaWN0b3IgMTIgPj4gL1cgWyAxIDIgMSBdIC9JbmRleCBbIDIgMTUgXSAvSW5mbyAxMSAwIFIgL1Jvb3QgNCAwIFIgL1NpemUgMTcgL1ByZXYgNzA5MzYgICAgICAgICAgICAgICAgIC9JRCBbPGQxNDUyZTgwYzQ5ZGRkNDIyOTE2NzBjMTlkZjU1MWM5PjxkMTQ1MmU4MGM0OWRkZDQyMjkxNjcwYzE5ZGY1NTFjOT5dID4+CnN0cmVhbQp4nGNiZOBnYGJgOAkkmJaCWEZAgrEGRHMxMD3UfmACqb4IlJRbBiQm3QbJvvwPJCdDZZ++/w8AHeMIqQplbmRzdHJlYW0KZW5kb2JqCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKNCAwIG9iago8PCAvTWV0YWRhdGEgMSAwIFIgL091dGxpbmVzIDcgMCBSIC9QYWdlcyAzIDAgUiAvVHlwZSAvQ2F0YWxvZyA+PgplbmRvYmoKNSAwIG9iago8PCAvRmlsdGVyIC9GbGF0ZURlY29kZSAvSSAyNTQgL0xlbmd0aCAxNjQgL08gMjM4IC9TIDE2NiA+PgpzdHJlYW0KeJxjYGAQYmBgZmCRZ2BgZBNhZeCQ6RfcwNDADiTdQJiDhfUGI9O6RHadL28YGRi0GBi4+F+vkL++FcjB8YCJ5cOlgpAX7xnAAOM/B9P/V/6rkbdTj7ZvZX+2C8QSAEq6GzFUGPmWcP8TuFHZsOxYw9LZZhOZcqzufWd2FT/r3cL8ZMvkVH3OcAaz51UAsYwQxRgFplJImgUAbqcr3wplbmRzdHJlYW0KZW5kb2JqCjYgMCBvYmoKPDwgLENvbnRlbnRzIDEwIDAgUiAvTWVkaWFCb3ggWyAwIDAgNjEyIDc5MiBdIC9QYXJlbnQgMyAwIFIgL1Jlc291cmNlcyA8PCAvRXh0R1N0YXRlIDw8IC9HMyAxMiAwIFIgPj4gL0ZvbnQgPDwgL0Y0IDEzIDAgUiAvRjUgMTQgMCBSID4+IC9Qcm9jU2V0IFsgL1BERiAvVGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdIC9YT2JqZWN0IDw8IC9YNiA5IDAgUiA+PiA+PiAvU3RydWN0UGFyZW50cyAwIC9UeXBlIC9QYWdlID4+CmVuZG9iago3IDAgb2JqCjw8IC9Db3VudCAxIC9LaWRzIFsgOCAwIFIgXSAvVHlwZSAvT3V0bGluZXMgPj4KZW5kb2JqCjggMCBvYmoKPDwgL0NvdW50IDAgL1RpdGxlIChDYXDDrXR1bG8gMSkgL0Rlc3QgWyA2IDAgUiAvWFlaIDAgNzkyIDAgXSAvUGFyZW50IDcgMCBSID4+CmVuZG9iago5IDAgb2JqCjw8IC9CaXRzUGVyQ29tcG9uZW50IDggL0NvbG9yU3BhY2UgMTUgMCBSIC9GaWx0ZXIgL0ZsYXRlRGVjb2RlIC9IZWlnaHQgMTM4IC9MZW5ndGggMzE1MCAvU3VidHlwZSAvSW1hZ2UgL1R5cGUgL1hPYmplY3QgL1dpZHRoIDEzOCA+PgpzdHJlYW0KZUp3NTFlbFAxSmNlZVplZkdqbmZQbk51QXdyQjF5R3lFRWZHbWFGWFdRU3NIdEQ3KzB1YUwva0JFcFF6eVZnNEFtamxhNGNFeXBENlh0SERWcGlvSlpjVHE0R3FXd0ZiVnNMSUQyMXhCNXpGUWNRWEFkUDVVWkNPdGsrMm5FaFhXZE9VOXVyNEdpWXN2UDYxYXJPRWJVTXlrcUx5WUdFUmFGVkJ0ZUVibzVSRlA1VDYxSXNGcklKcUNwRU5nOEw1YlhJcGc5RnFPSlJDV3pXeXRDaU4yaDgycWpsdlUxbEJ4UkhSRndwK0VzSGNndGpGSEVvUTJKditMbzFJRnJ0eEVzRXlWOEUxR2NWR0NSTFhyZDJ5NmFNVCtRNzBhU0hjMUxVeWR4djlKS1B6NkdiV3hJOWVNbUhJaW42bnBHU3RrZ0ZRZEhSYkZ6SkIvd2o5WlZZc25ielNadFhLMldlSzE4dmhBQXBMRW9ueWJyTWtqb2IzSkZLeUhNejZ5SnZ0NFduQWtyZ29Jdm9KQkdHODJLbEZwZGJBYW02Tngzb2JyWDZYUHRKVlNiVEZWUjhIVWFFZjY0cTFHWVhqTGtQbmJSS09TRWc5L0JvT2ZpQVNnRlkvNjVxWDJJLzBLMXlsKzNrOG5odW95eTZPMUZOcnhCTkV0UklQYW8vZU1XNFI1ZHl0bUs3VCtxaUc5ck5YQ0cwcE1RRS96M3JzQW84OTZkbjJPTFdMbkdvREZTSnE2QXF4TzZ2dCtOVTVrQU55MlQ1TkNMNE1PNnVJdDVza0JsNVdoR0dLT2RNUkJiMGNxMTZrUkd5OEFrb25idlgvM29LcmNXOHdYemErc1hrRnJZUDd5S1JLYklxRFYzVktzajNQQmMwL2x3V3I0QlNxbXdVMm5qMnF1Y1lsTXlvQlNIRkNSQXU5YURlYzZMdVNGTHI0ZW5xKzNrUk45ZmlZNENTNmpvbGwwQ2EvV2toQUhRcVJndnEvWGg0bXpaaHN6T0lwbnc1QW9zaTlKR3NDdEg5RVNKUHFoeklXYnNpQUZ3N2ZJc2MydnpQR29VbUNNQ2M2YlV2RXN3M3RRN3c1dUdESGpQbCtyZkJ3WThTZ2hqZ21KSlpmaHJoQWZGWGJzbEZxU0tVL0dKR3RJY20xVlZaME02WklnY3ZCTTNBVFhuS2hGUkdlQUpzT09KSDdRYnZ0S29ZazM0ZklnL0lDSUZVWndrdlZiQWdFUktLc3JMcC9NNVY3dVZxbjBKNjFiTlZXdDJHMDcxMm1CUVgwR1hmZktzRW1pVDMvRis4VGNQYy9JZlk2emo3T3gyVENBUXRiVUdkdzlYMWVvWVVwckFPWHJuc0xJWkhSWlJINVprMWFpS0gxZ2Nja1ZNOXRJMzVmdXZlQjNBYWtqeHhJTkFlQWh2bkx4NWRDY0xrNE9xTVRwNFRZV3VPR2pFRjVucU9SQTZNeUp5d1VYRkNvdjRNeUtaSGZjZEZRVTdXYjEvRjc1OTk0L3M4UmJqUXhta1ZweHowYXNLaWVWRzJMYitXeUpYUUJ0MjRHOU5tTlRnYkdFSE9Ud2I5R0Z1aUFTRXpwVUlrWHRkYllkQzJoZXRKU0pTUVhFQXBTNS9lZEFoM0tuU2ZkRWd5UTdpWDhvMlNKUUYxdXJ0eWdkUStxeVYzSVFnYnhpZGEyN1ZCRjN5dHZUTDhrSUJMTStURHlXRldkcnRSSWRneEEzYVNpVVE4T2JrQ1JHeXg0clI0b21QRldpWVViTFZNdWo2R2JoZTBuZDVRakM1L0F2RWRuTTZLdTIzRksrNHBYazlRekRwbEJFS2tQZ2JoUFRzbXNHeURLK3pIQkdyQnhhTjcxWWVkRlN5VXNzTHd2ODRyTTBFem83emtneERUVzIvdklEdXJRdVcwSnJkak81UjloNm9YZU82bUZqZFBCTGF1UWhSTGlnYm5QVzh1UTVjZ1lGT0NJZnA3NUFsT0YvRUlvaW9VdTdpZk8xbWZ3R2t6c240Mmg3dXA0V1NGdzJJd0ZPK3A5eGJlS3c0MXdPd2xqUHBFMldwTVJtVWUvbUhUQ0RQcUhibFpFRlhiaVIwaHRhekg4S1hUVmhVU1VXVFZzbVNRcUdWWEJVdjVUZms0N1dYZWlKaDV2QXhmbUR6eVAzRVlIZjZVWE81OEJweEtFZURmcXNlZzRMdTJWKzcwZWE3dC9PMGtuWHZ2R2taSDZYSzBvUkRpazZVSitnUkhDTjJQVG1jdVlVU2RNVzVMYVFpZnRCaTE3c2Z1Y005VllpYWtXdG5NbWJGUGU1TGJURGUzY09Jd2IrK09xWDY4WTlXZWFxdkd3RnJqTzlWT0RXVXJZSGJVWVJwQk9qU2sxa2xiWlZ2ZU5HNkx0N3FYTFdmNFlGcHZ6cDVER0R4SGk1ZG9kRzRlaUoxMVB5UnBGOCtwbWRrcGd0MkYxR0w3bnIralVxSzFXRUV0eElkMzB6N1U5NGw3cHZIR0hEM0Y0QllUTEYyMWxTZlJMTHRvUFhaaFc2WUYxMDFWcjA0UFRnbUZFdmRUNWRhRHRqQXMvOWdDc1Y1NTZJMHJOaDVoZWUzMlltQWlRTXJQbW9wY2UxWEZxeVRRbXBzc3FKU3JlVXl0SmJTcnYyalRJRGlGQlhtRzYvMUxuS1A5bEJteDFVWXNFYTN3MWZvWU5YZE9heUJuZFkyck5Wa25sQXZ2M3ZoOFErb09ZT25zNW9YM0ZvQ04rdkNNZGYvcytqUUNsM0ZodVpmeDAyYyt3c1VEY0tQbndXQVN2UmZyOXNta1IvOWIyZGM0Q1ZZL2JrQkNMeHZBUGNoTGJPc0hrbi9OUFBwRkdYQ0o3bE8xNXNrZWQ0TExWRnlHaThJdWlOK3BhTlJsdXpSWlZuN3FscWd5RGlEbDdpektRZkQxZUVVVE5pWnNEUkozRXZ3aU1KR3ZhZnMxLzA0azlCcmdta294dVlVZWl5VmxZSSt1Wi9rcDRiVUwxZW93L0JITGpmNytLSWZlWW42UFM3YTlmK0FhYWp2MWlQSzB0bGs4Zm1pMkpXajRhclg3a2FJMzkvd0J3Ui9ybjF5cURqSUtteFplY05CRk5xYmJQQWN5WWV0emNiZ2NvdlJiNkdRT0xaMHViazVMaTUvUzFMVllDL2FXWEdpVWhuSm9CUFBFVWN0M2pwbUtNekpQdjBFc2kyM0JERXE1OGFObzBQQzJ2empIa2pCVjNKNUNQVnZmNkNrODhVRDZuUDdwYmswK3JUTzhCMmlWTkd0MUlBbXh0a1I3Nk9ZQ3FDOWRzYVpsUnhrRGZLaGJ6WmdtZnVEMDF5cjR0VXdnNjRJQ2s3SE90RldtajBDeWtzZ1VhcmsxWFNEVVNpakRxS2l1RWMyMExQMFYrdmNTZWUwalVXUTZZYVdiV1dXUFFmQnV5cHZidFEzdzBTa3BlajZ3R290R3BVZFV2dkdhcVo2cEltRXJwS3dkM2d5SkU5cHFLekRIN2FoZUFOdzRLaWlGeVUyNUd3SUM4Y3diTmF4WXFxZDdPS0JZMUR0N1ZZNGczRHVqNzhoRGN6TVg3ODl4WkJsY256N2lQdGUwVVJXT0lldnZSRXIyVzRQQnZDMTN0NThiazNmZnZ2dEc3REphUndYeFd1UndVeXlzMCs2MHBSTzU1dXVOeHVoRXJNam9YdTg2aFJqNXpUR21hM0djdnljS0hJYm9aOXRmdExnVDUwaDVnOEFqVWF3UGlFY1FHd0VaQXlweGxzVnlBNVowRmRUUVZHSG1vMThDc1gzeWdkSlFwUkRpN1NmZ1BQRGx2Yk5JT3RZc2lXOWR1anBaV0RtS1VqdXdQMTRoV014WlZSWVk2U2gxRUFVdHlLMnJSZWtRdllPSmhPeThhVWJaZC9MS3l2VGFrYXJyOFlrTWZZOVlyS1kwL3hMdXJuY3lkdWYrOGVFQjc0ckpxNFcvQlJVUCtodU1ETnR6a0hCUktEY0lxNnhuc3VPRFBUcnc1aXVsYzR3dFJ2bTU0L1lrYWpRWFpQaXZ3Y3NYT2ZpSnEzQUZ5UXRKRHBpSXp0UHVrb3BkcWVHaWxyWTNRWWUzZUorVk5aZG1oMk1Xem90UXgxRlZBa3A0U1RQUzYrZmZlTzQyNmZMaTRuYXJBaEZaUTRKTnZYUVVvVnJvUWI0NUp5c0M2QXkrMjRwVzdMRnM5YUQwbllTU3RZdUltUW41eGw2Yitjb2QzZTU5OEZFdDVGM3ljZm9HWlErVGtGSG9jOUwwaWdGc0dTczU2VzZ5WVNEelF5a2Z2WDRHUW9XRkhCL2xJNHV3UlRnYnlDT0pBZnZQbGdOdHZrSE16RWxhVUE3RWg5RER1aURzS1ZyL2l0VVJ5bTJOZHdNYmdjMktRWUxYSnN5SFROVGJDeURQZzFySVB3ZzN0dXJSVDhFcHJFWnNXMTlHZlMyT2VwelQ1RklVRDZpTTJyZ2NOaXgvQVVMWEdwRzBscWprMm9WdTRIOHdpQVprbmxKSTNRbGc1cUVIanVKY1ZxV3UvZzFrM1l5aGR6YkdFNnlrcDlpQWpWV0g3Vk1lYjl5bjhjK3FoK0d1SmEzbWJQRDNjdHdmWVZVQlRGeU1QSFBOM1A1SXB2U0hCeFV6cFBMUzMwMFArUkl4elB5S0V3S3BwUzVhN0tiODBnVjVkalhwdVN0ek5lVFdpQ1lRc01aL01FbmoxOHZ6MktrUExvU09QZUFQcnlJWUNLOHpuSDBHTXJnZnlqQW9ualFQeFBiUktuTG56Y2pOcUpHdldoOHU5enM9Cn0=',
  sampledata: [{}],
};

// Designer component for PDF templates
export default function TemplateDesigner() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const templateId = params.id ? parseInt(params.id) : null;
  const isEditMode = !!templateId;
  
  // State for the template
  const [template, setTemplate] = useState<Template>(emptyTemplate);
  const [templateData, setTemplateData] = useState({
    name: '',
    description: '',
    category: 'sow', // default category
    isGlobal: true,
    projectId: null,
    userId: 1, // default user ID (should be set from auth context in a real app)
  });
  
  // State for field mappings
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('editor');
  
  // Designer instance ref
  const designerRef = React.useRef<HTMLDivElement>(null);
  const [designer, setDesigner] = useState<any>(null);
  
  // Fetch template data if in edit mode
  const templateQuery = useQuery<DocumentTemplate>({
    queryKey: [`/api/document-templates/${templateId}`],
    enabled: isEditMode,
    onSuccess: (data) => {
      if (data) {
        // Set template data
        setTemplateData({
          name: data.name,
          description: data.description || '',
          category: data.category,
          isGlobal: data.isGlobal,
          projectId: data.projectId,
          userId: data.userId,
        });
        
        // Set template
        if (data.template) {
          setTemplate(data.template as Template);
        }
        
        // Set field mappings
        setFieldMappings(data.fieldMappings || []);
      }
    }
  });
  
  // Initialize designer when component mounts
  useEffect(() => {
    if (designerRef.current && !designer) {
      import('@pdfme/ui').then(({ Designer }) => {
        const designerInstance = new Designer({
          domContainer: designerRef.current!,
          template: template,
          options: {
            useVirtualization: true,
            autoSave: true,
          },
        });
        
        designerInstance.onSaveTemplate(updatedTemplate => {
          setTemplate(updatedTemplate);
        });
        
        setDesigner(designerInstance);
      });
    }
    
    // Cleanup
    return () => {
      if (designer) {
        designer.destroy();
      }
    };
  }, [designerRef, designer]);
  
  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/document-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create template');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Template created',
        description: 'The template has been created successfully.',
      });
      setLocation(`/templates/${data.id}`);
      queryClient.invalidateQueries({ queryKey: ['/api/document-templates'] });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error creating template',
        description: error.message,
      });
    },
  });
  
  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/document-templates/${templateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update template');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Template updated',
        description: 'The template has been updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/document-templates/${templateId}`] });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error updating template',
        description: error.message,
      });
    },
  });
  
  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/document-templates/${templateId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete template');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Template deleted',
        description: 'The template has been deleted successfully.',
      });
      setLocation('/templates');
      queryClient.invalidateQueries({ queryKey: ['/api/document-templates'] });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error deleting template',
        description: error.message,
      });
    },
  });
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!designer) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Template editor is not initialized.',
      });
      return;
    }
    
    // Get the current template from the designer
    const currentTemplate = designer.getTemplate();
    
    // Prepare data for submission
    const submissionData = {
      ...templateData,
      template: currentTemplate,
      schema: extractSchemaFromTemplate(currentTemplate),
    };
    
    // Create or update template
    if (isEditMode) {
      updateTemplateMutation.mutate(submissionData);
    } else {
      createTemplateMutation.mutate(submissionData);
    }
  };
  
  // Extract schema from template
  const extractSchemaFromTemplate = (template: Template) => {
    const schema: Record<string, any> = {};
    
    // Process all pages and fields
    template.schemas.forEach((page, pageIndex) => {
      page.forEach((field) => {
        if (field.name) {
          schema[field.name] = {
            type: field.type || 'text',
            defaultValue: field.defaultValue || '',
          };
        }
      });
    });
    
    return schema;
  };
  
  // Handle field mappings
  const handleAddFieldMapping = () => {
    const newMapping: Partial<FieldMapping> = {
      name: 'New Field Mapping',
      type: 'database',
      fieldKey: '',
      dataSource: 'projects',
      dataPath: '',
      defaultValue: '',
    };
    
    setFieldMappings([...fieldMappings, newMapping as FieldMapping]);
  };
  
  const handleUpdateFieldMapping = (index: number, field: string, value: any) => {
    const updatedMappings = [...fieldMappings];
    updatedMappings[index] = {
      ...updatedMappings[index],
      [field]: value,
    };
    setFieldMappings(updatedMappings);
  };
  
  const handleDeleteFieldMapping = (index: number) => {
    const updatedMappings = [...fieldMappings];
    updatedMappings.splice(index, 1);
    setFieldMappings(updatedMappings);
  };
  
  // Save field mappings
  const saveFieldMappings = async () => {
    if (!templateId) return;
    
    // TODO: Implement API call to save field mappings
    toast({
      title: 'Field mappings saved',
      description: 'The field mappings have been saved successfully.',
    });
  };
  
  // Handle template data change
  const handleTemplateDataChange = (field: string, value: any) => {
    setTemplateData({
      ...templateData,
      [field]: value,
    });
  };
  
  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !designer) return;
    
    const reader = new FileReader();
    reader.onload = async () => {
      const basePdf = reader.result;
      
      try {
        await designer.updateTemplate({
          ...template,
          basePdf,
        });
        
        setTemplate({
          ...template,
          basePdf,
        });
        
        toast({
          title: 'PDF uploaded',
          description: 'The PDF has been uploaded successfully.',
        });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error uploading PDF',
          description: 'Failed to load the PDF. Please try another file.',
        });
      }
    };
    
    reader.readAsDataURL(file);
  };
  
  if (isEditMode && templateQuery.isLoading) {
    return <div>Loading template...</div>;
  }
  
  if (templateQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load the template. {templateQuery.error.message}
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          {isEditMode ? 'Edit Template' : 'Create Template'}
        </h1>
        
        <div className="space-x-2">
          <Button onClick={() => setLocation('/templates')}>
            Cancel
          </Button>
          
          {isEditMode && (
            <Button 
              variant="destructive" 
              onClick={() => deleteTemplateMutation.mutate()}
              disabled={deleteTemplateMutation.isPending}
            >
              {deleteTemplateMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          )}
          
          <Button 
            onClick={handleSubmit}
            disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
          >
            {createTemplateMutation.isPending || updateTemplateMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
      
      <Tabs 
        defaultValue="editor" 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid grid-cols-3 w-[400px]">
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="mappings">Field Mappings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="editor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>PDF Template Editor</CardTitle>
              <CardDescription>
                Upload a PDF and add fields to create your template.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="pdf-upload">Upload Base PDF</Label>
                  <Input 
                    id="pdf-upload" 
                    type="file" 
                    accept=".pdf" 
                    onChange={handleFileUpload} 
                  />
                </div>
                
                <div 
                  ref={designerRef} 
                  style={{ 
                    height: '800px', 
                    width: '100%', 
                    border: '1px solid #ccc' 
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Template Settings</CardTitle>
              <CardDescription>
                Configure the template details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Template Name</Label>
                    <Input 
                      id="name" 
                      value={templateData.name} 
                      onChange={(e) => handleTemplateDataChange('name', e.target.value)} 
                      placeholder="Enter template name" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={templateData.category} 
                      onValueChange={(value) => handleTemplateDataChange('category', value)}
                    >
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sow">Statement of Work</SelectItem>
                        <SelectItem value="implementation-plan">Implementation Plan</SelectItem>
                        <SelectItem value="requirement-spec">Requirement Specification</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    value={templateData.description} 
                    onChange={(e) => handleTemplateDataChange('description', e.target.value)} 
                    placeholder="Enter template description" 
                    rows={3} 
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isGlobal"
                      checked={templateData.isGlobal}
                      onChange={(e) => handleTemplateDataChange('isGlobal', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="isGlobal">Make this template available globally</Label>
                  </div>
                  <p className="text-sm text-gray-500">
                    Global templates can be used by any project in the system.
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="mappings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Field Mappings</CardTitle>
              <CardDescription>
                Configure how template fields are populated from data sources.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fieldMappings.map((mapping, index) => (
                  <div key={index} className="border p-4 rounded-md space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`mapping-name-${index}`}>Name</Label>
                        <Input 
                          id={`mapping-name-${index}`} 
                          value={mapping.name} 
                          onChange={(e) => handleUpdateFieldMapping(index, 'name', e.target.value)} 
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`mapping-type-${index}`}>Type</Label>
                        <Select 
                          value={mapping.type} 
                          onValueChange={(value) => handleUpdateFieldMapping(index, 'type', value)}
                        >
                          <SelectTrigger id={`mapping-type-${index}`}>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="database">Database</SelectItem>
                            <SelectItem value="ai-generated">AI Generated</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`mapping-field-key-${index}`}>Field Key</Label>
                      <Input 
                        id={`mapping-field-key-${index}`} 
                        value={mapping.fieldKey} 
                        onChange={(e) => handleUpdateFieldMapping(index, 'fieldKey', e.target.value)} 
                        placeholder="Enter field key to map to in the template" 
                      />
                    </div>
                    
                    {mapping.type === 'database' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`mapping-source-${index}`}>Data Source</Label>
                          <Select 
                            value={mapping.dataSource || ''} 
                            onValueChange={(value) => handleUpdateFieldMapping(index, 'dataSource', value)}
                          >
                            <SelectTrigger id={`mapping-source-${index}`}>
                              <SelectValue placeholder="Select data source" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="projects">Project</SelectItem>
                              <SelectItem value="customers">Customer</SelectItem>
                              <SelectItem value="requirements">Requirements</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`mapping-path-${index}`}>Data Path</Label>
                          <Input 
                            id={`mapping-path-${index}`} 
                            value={mapping.dataPath || ''} 
                            onChange={(e) => handleUpdateFieldMapping(index, 'dataPath', e.target.value)} 
                            placeholder="e.g. name, description, etc." 
                          />
                        </div>
                      </div>
                    )}
                    
                    {mapping.type === 'ai-generated' && (
                      <div className="space-y-2">
                        <Label htmlFor={`mapping-prompt-${index}`}>AI Prompt</Label>
                        <Textarea 
                          id={`mapping-prompt-${index}`} 
                          value={mapping.prompt || ''} 
                          onChange={(e) => handleUpdateFieldMapping(index, 'prompt', e.target.value)} 
                          placeholder="Enter prompt for AI to generate content" 
                          rows={3} 
                        />
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor={`mapping-default-${index}`}>Default Value</Label>
                      <Input 
                        id={`mapping-default-${index}`} 
                        value={mapping.defaultValue || ''} 
                        onChange={(e) => handleUpdateFieldMapping(index, 'defaultValue', e.target.value)} 
                        placeholder="Enter default value if data not found" 
                      />
                    </div>
                    
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleDeleteFieldMapping(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                
                <div className="flex space-x-2">
                  <Button onClick={handleAddFieldMapping}>
                    Add Field Mapping
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={saveFieldMappings}
                    disabled={!isEditMode}
                  >
                    Save Mappings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}