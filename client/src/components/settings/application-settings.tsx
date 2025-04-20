import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Loader2, Save, RefreshCw, Users } from 'lucide-react';
import { ProjectRoleTemplate } from '@/lib/types';
import { UserManagement } from './user-management';

// Application Settings Types - imported from shared
interface GeneralSettings {
  applicationName: string;
  companyName: string;
  supportEmail: string;
  maxFileUploadSize: number; // In bytes
  defaultLanguage: string;
  timeZone: string;
}

interface PasswordPolicy {
  minLength: number;
  requireSpecialChars: boolean;
  requireNumbers: boolean;
  requireUppercase: boolean;
  requireLowercase: boolean;
}

interface AuthSettings {
  passwordPolicy: PasswordPolicy;
  mfaEnabled: boolean;
  sessionTimeout: number; // In minutes
  allowSelfRegistration: boolean;
  loginAttempts: number; // Max failed login attempts
}

interface NotificationSettings {
  emailNotificationsEnabled: boolean;
  systemNotificationsEnabled: boolean;
  defaultReminderTime: number; // In hours before deadline
}

interface IntegrationSettings {
  aiProvider: 'google' | 'openai' | 'anthropic' | 'huggingface';
  aiModel: string;
  aiApiRateLimit: number;
  enableThirdPartyIntegrations: boolean;
}

interface TaskTemplate {
  name: string;
  description: string;
  estimatedHours: number;
  complexity: 'low' | 'medium' | 'high';
  taskType: string;
  implementationSteps: string[];
}

interface TemplateSettings {
  implementationTaskTemplates: TaskTemplate[];
  projectRoleTemplates: ProjectRoleTemplate[];
  defaultTaskType: string;
  defaultComplexity: 'low' | 'medium' | 'high';
  enableTemplateLibrary: boolean;
}

interface ApplicationSettingsData {
  general: GeneralSettings;
  auth: AuthSettings;
  notifications: NotificationSettings;
  integrations: IntegrationSettings;
  templates: TemplateSettings;
  [key: string]: any; // Allow for future extension of settings categories
}

// Default settings template - used for new installations
const defaultSettings: ApplicationSettingsData = {
  general: {
    applicationName: 'Glossa - Requirement Management',
    companyName: 'Glossa AI',
    supportEmail: 'support@example.com',
    maxFileUploadSize: 10485760, // 10MB
    defaultLanguage: 'en',
    timeZone: 'UTC'
  },
  auth: {
    passwordPolicy: {
      minLength: 8,
      requireSpecialChars: true,
      requireNumbers: true,
      requireUppercase: true,
      requireLowercase: true
    },
    mfaEnabled: false,
    sessionTimeout: 60, // 60 minutes
    allowSelfRegistration: false,
    loginAttempts: 5
  },
  notifications: {
    emailNotificationsEnabled: true,
    systemNotificationsEnabled: true,
    defaultReminderTime: 24 // 24 hours
  },
  integrations: {
    aiProvider: 'google',
    aiModel: 'gemini-pro',
    aiApiRateLimit: 10,
    enableThirdPartyIntegrations: true
  },
  templates: {
    implementationTaskTemplates: [
      {
        name: 'Basic Implementation',
        description: 'Standard implementation task for basic features',
        estimatedHours: 4,
        complexity: 'medium',
        taskType: 'implementation',
        implementationSteps: ['Analyze requirements', 'Design solution', 'Implement code', 'Test functionality']
      },
      {
        name: 'Complex Integration',
        description: 'Integration task requiring multiple systems',
        estimatedHours: 8,
        complexity: 'high',
        taskType: 'integration',
        implementationSteps: ['Analyze integration points', 'Design data flow', 'Implement adapters', 'Configure endpoints', 'Test end-to-end flow']
      },
      {
        name: 'Bug Fix',
        description: 'Task for fixing identified issues',
        estimatedHours: 2,
        complexity: 'low',
        taskType: 'bug-fix',
        implementationSteps: ['Reproduce issue', 'Identify root cause', 'Implement fix', 'Verify resolution']
      }
    ],
    projectRoleTemplates: [
      {
        id: 'default-1',
        name: 'Onshore Senior Developer',
        roleType: 'Developer',
        locationType: 'Onshore',
        seniorityLevel: 'Senior',
        description: 'Experienced developer working in client timezone',
        costRate: '120',
        costUnit: 'Hour',
        currency: 'USD',
        isActive: true
      },
      {
        id: 'default-2',
        name: 'Offshore Junior QA',
        roleType: 'QA',
        locationType: 'Offshore',
        seniorityLevel: 'Junior',
        description: 'Entry-level quality assurance specialist working remotely',
        costRate: '40',
        costUnit: 'Hour',
        currency: 'USD',
        isActive: true
      },
      {
        id: 'default-3',
        name: 'Onshore Business Analyst',
        roleType: 'Business Analyst',
        locationType: 'Onshore',
        seniorityLevel: 'Mid-Level',
        description: 'Requirements gathering and analysis specialist',
        costRate: '95',
        costUnit: 'Hour',
        currency: 'USD',
        isActive: true
      }
    ],
    defaultTaskType: 'implementation',
    defaultComplexity: 'medium',
    enableTemplateLibrary: true
  }
};

export function ApplicationSettings() {
  const [activeTab, setActiveTab] = useState('general');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch application settings
  const { 
    data: settings, 
    isLoading, 
    isError, 
    error 
  } = useQuery({
    queryKey: ['/api/application-settings'],
    refetchOnWindowFocus: false
  });
  
  // Local state for form
  const [formData, setFormData] = useState<ApplicationSettingsData>(defaultSettings);
  
  // Update local form state when settings are loaded
  useEffect(() => {
    if (settings) {
      // Make sure templates property exists, if not, initialize it with defaults
      const updatedSettings = {
        ...settings,
        templates: settings.templates || {
          implementationTaskTemplates: [
            {
              name: 'Basic Implementation',
              description: 'Standard implementation task for basic features',
              estimatedHours: 4,
              complexity: 'medium',
              taskType: 'implementation',
              implementationSteps: ['Analyze requirements', 'Design solution', 'Implement code', 'Test functionality']
            },
            {
              name: 'Complex Integration',
              description: 'Integration task requiring multiple systems',
              estimatedHours: 8,
              complexity: 'high',
              taskType: 'integration',
              implementationSteps: ['Analyze integration points', 'Design data flow', 'Implement adapters', 'Configure endpoints', 'Test end-to-end flow']
            },
            {
              name: 'Bug Fix',
              description: 'Task for fixing identified issues',
              estimatedHours: 2,
              complexity: 'low',
              taskType: 'bug-fix',
              implementationSteps: ['Reproduce issue', 'Identify root cause', 'Implement fix', 'Verify resolution']
            }
          ],
          projectRoleTemplates: [
            {
              id: 'default-1',
              name: 'Onshore Senior Developer',
              roleType: 'Developer',
              locationType: 'Onshore',
              seniorityLevel: 'Senior',
              description: 'Experienced developer working in client timezone',
              costRate: '120',
              costUnit: 'Hour',
              currency: 'USD',
              isActive: true
            },
            {
              id: 'default-2',
              name: 'Offshore Junior QA',
              roleType: 'QA',
              locationType: 'Offshore',
              seniorityLevel: 'Junior',
              description: 'Entry-level quality assurance specialist working remotely',
              costRate: '40',
              costUnit: 'Hour',
              currency: 'USD',
              isActive: true
            },
            {
              id: 'default-3',
              name: 'Onshore Business Analyst',
              roleType: 'Business Analyst',
              locationType: 'Onshore',
              seniorityLevel: 'Mid-Level',
              description: 'Requirements gathering and analysis specialist',
              costRate: '95',
              costUnit: 'Hour',
              currency: 'USD',
              isActive: true
            }
          ],
          defaultTaskType: 'implementation',
          defaultComplexity: 'medium',
          enableTemplateLibrary: true
        }
      };
      setFormData(updatedSettings);
    }
  }, [settings]);
  
  // Mutation for updating settings
  const updateSettingsMutation = useMutation({
    mutationFn: (data: ApplicationSettingsData) => {
      return apiRequest('/api/application-settings', {
        method: 'PUT',
        data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/application-settings'] });
      toast({
        title: 'Settings updated',
        description: 'Application settings have been saved successfully.',
        variant: 'default'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update settings. Please try again.',
        variant: 'destructive'
      });
    }
  });
  
  // Handle form input changes
  const handleInputChange = (section: keyof ApplicationSettingsData, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };
  
  // Handle nested input changes (like for password policy)
  const handleNestedInputChange = (section: keyof ApplicationSettingsData, parentField: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [parentField]: {
          ...prev[section][parentField],
          [field]: value
        }
      }
    }));
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate(formData);
  };
  
  // Reset form to last saved settings
  const handleReset = () => {
    if (settings) {
      // Make sure templates property exists when resetting too
      const updatedSettings = {
        ...settings,
        templates: settings.templates || {
          implementationTaskTemplates: [
            {
              name: 'Basic Implementation',
              description: 'Standard implementation task for basic features',
              estimatedHours: 4,
              complexity: 'medium',
              taskType: 'implementation',
              implementationSteps: ['Analyze requirements', 'Design solution', 'Implement code', 'Test functionality']
            }
          ],
          projectRoleTemplates: [
            {
              id: 'default-1',
              name: 'Onshore Senior Developer',
              roleType: 'Developer',
              locationType: 'Onshore',
              seniorityLevel: 'Senior',
              description: 'Experienced developer working in client timezone',
              costRate: '120',
              costUnit: 'Hour',
              currency: 'USD',
              isActive: true
            },
            {
              id: 'default-2',
              name: 'Offshore Junior QA',
              roleType: 'QA',
              locationType: 'Offshore',
              seniorityLevel: 'Junior',
              description: 'Entry-level quality assurance specialist working remotely',
              costRate: '40',
              costUnit: 'Hour',
              currency: 'USD',
              isActive: true
            },
            {
              id: 'default-3',
              name: 'Onshore Business Analyst',
              roleType: 'Business Analyst',
              locationType: 'Onshore',
              seniorityLevel: 'Mid-Level',
              description: 'Requirements gathering and analysis specialist',
              costRate: '95',
              costUnit: 'Hour',
              currency: 'USD',
              isActive: true
            }
          ],
          defaultTaskType: 'implementation',
          defaultComplexity: 'medium',
          enableTemplateLibrary: true
        }
      };
      setFormData(updatedSettings);
      toast({
        title: 'Form reset',
        description: 'Settings have been reset to last saved values.',
        variant: 'default'
      });
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading settings...</span>
      </div>
    );
  }
  
  if (isError) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Settings</CardTitle>
          <CardDescription>
            There was a problem loading the application settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </p>
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline" 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/application-settings'] })}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Application Settings</CardTitle>
        <CardDescription>
          Configure system-wide settings for your organization
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="app-settings-form" onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="auth">Authentication</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
              <TabsTrigger value="templates">Task Templates</TabsTrigger>
              <TabsTrigger value="roleTemplates">Role Templates</TabsTrigger>
              <TabsTrigger value="users">
                <Users className="h-4 w-4 mr-2" />
                User Management
              </TabsTrigger>
            </TabsList>
            
            {/* General Settings */}
            <TabsContent value="general" className="space-y-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="applicationName">Application Name</Label>
                    <Input 
                      id="applicationName" 
                      value={formData.general.applicationName} 
                      onChange={(e) => handleInputChange('general', 'applicationName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input 
                      id="companyName" 
                      value={formData.general.companyName} 
                      onChange={(e) => handleInputChange('general', 'companyName', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="supportEmail">Support Email</Label>
                  <Input 
                    id="supportEmail" 
                    type="email"
                    value={formData.general.supportEmail} 
                    onChange={(e) => handleInputChange('general', 'supportEmail', e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxFileUploadSize">Max File Upload Size (bytes)</Label>
                    <Input 
                      id="maxFileUploadSize" 
                      type="number"
                      value={formData.general.maxFileUploadSize} 
                      onChange={(e) => handleInputChange('general', 'maxFileUploadSize', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultLanguage">Default Language</Label>
                    <Select 
                      value={formData.general.defaultLanguage} 
                      onValueChange={(value) => handleInputChange('general', 'defaultLanguage', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="zh">Chinese</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="timeZone">Time Zone</Label>
                  <Select 
                    value={formData.general.timeZone} 
                    onValueChange={(value) => handleInputChange('general', 'timeZone', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time zone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                      <SelectItem value="Europe/London">London (GMT)</SelectItem>
                      <SelectItem value="Europe/Paris">Central European Time (CET)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Japan (JST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
            
            {/* Authentication Settings */}
            <TabsContent value="auth" className="space-y-4">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium">Password Policy</h3>
                  <Separator className="my-4" />
                  
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="minLength">Minimum Password Length</Label>
                      <Input 
                        id="minLength" 
                        type="number"
                        min={6}
                        value={formData.auth.passwordPolicy.minLength} 
                        onChange={(e) => handleNestedInputChange('auth', 'passwordPolicy', 'minLength', parseInt(e.target.value))}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="requireSpecialChars"
                          checked={formData.auth.passwordPolicy.requireSpecialChars}
                          onCheckedChange={(checked) => handleNestedInputChange('auth', 'passwordPolicy', 'requireSpecialChars', checked)}
                        />
                        <Label htmlFor="requireSpecialChars">Require Special Characters</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="requireNumbers"
                          checked={formData.auth.passwordPolicy.requireNumbers}
                          onCheckedChange={(checked) => handleNestedInputChange('auth', 'passwordPolicy', 'requireNumbers', checked)}
                        />
                        <Label htmlFor="requireNumbers">Require Numbers</Label>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="requireUppercase"
                          checked={formData.auth.passwordPolicy.requireUppercase}
                          onCheckedChange={(checked) => handleNestedInputChange('auth', 'passwordPolicy', 'requireUppercase', checked)}
                        />
                        <Label htmlFor="requireUppercase">Require Uppercase Letters</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="requireLowercase"
                          checked={formData.auth.passwordPolicy.requireLowercase}
                          onCheckedChange={(checked) => handleNestedInputChange('auth', 'passwordPolicy', 'requireLowercase', checked)}
                        />
                        <Label htmlFor="requireLowercase">Require Lowercase Letters</Label>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium">Security Settings</h3>
                  <Separator className="my-4" />
                  
                  <div className="grid gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="mfaEnabled"
                        checked={formData.auth.mfaEnabled}
                        onCheckedChange={(checked) => handleInputChange('auth', 'mfaEnabled', checked)}
                      />
                      <Label htmlFor="mfaEnabled">Enable Multi-Factor Authentication</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="allowSelfRegistration"
                        checked={formData.auth.allowSelfRegistration}
                        onCheckedChange={(checked) => handleInputChange('auth', 'allowSelfRegistration', checked)}
                      />
                      <Label htmlFor="allowSelfRegistration">Allow Self Registration</Label>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                        <Input 
                          id="sessionTimeout" 
                          type="number"
                          min={15}
                          value={formData.auth.sessionTimeout} 
                          onChange={(e) => handleInputChange('auth', 'sessionTimeout', parseInt(e.target.value))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="loginAttempts">Max Login Attempts</Label>
                        <Input 
                          id="loginAttempts" 
                          type="number"
                          min={1}
                          value={formData.auth.loginAttempts} 
                          onChange={(e) => handleInputChange('auth', 'loginAttempts', parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* Notification Settings */}
            <TabsContent value="notifications" className="space-y-4">
              <div className="grid gap-6">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="emailNotificationsEnabled"
                    checked={formData.notifications.emailNotificationsEnabled}
                    onCheckedChange={(checked) => handleInputChange('notifications', 'emailNotificationsEnabled', checked)}
                  />
                  <Label htmlFor="emailNotificationsEnabled">Enable Email Notifications</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="systemNotificationsEnabled"
                    checked={formData.notifications.systemNotificationsEnabled}
                    onCheckedChange={(checked) => handleInputChange('notifications', 'systemNotificationsEnabled', checked)}
                  />
                  <Label htmlFor="systemNotificationsEnabled">Enable System Notifications</Label>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="defaultReminderTime">Default Reminder Time (hours before deadline)</Label>
                  <Input 
                    id="defaultReminderTime" 
                    type="number"
                    min={1}
                    value={formData.notifications.defaultReminderTime} 
                    onChange={(e) => handleInputChange('notifications', 'defaultReminderTime', parseInt(e.target.value))}
                  />
                </div>
              </div>
            </TabsContent>
            
            {/* Integration Settings */}
            <TabsContent value="integrations" className="space-y-4">
              <div className="grid gap-6">
                <div className="space-y-2">
                  <Label htmlFor="aiProvider">AI Provider</Label>
                  <Select 
                    value={formData.integrations.aiProvider} 
                    onValueChange={(value) => handleInputChange('integrations', 'aiProvider', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select AI provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google">Google (Gemini)</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                      <SelectItem value="huggingface">Hugging Face</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="aiModel">Default AI Model</Label>
                  <Input 
                    id="aiModel" 
                    value={formData.integrations.aiModel} 
                    onChange={(e) => handleInputChange('integrations', 'aiModel', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="aiApiRateLimit">API Rate Limit (requests per minute)</Label>
                  <Input 
                    id="aiApiRateLimit" 
                    type="number"
                    min={1}
                    value={formData.integrations.aiApiRateLimit} 
                    onChange={(e) => handleInputChange('integrations', 'aiApiRateLimit', parseInt(e.target.value))}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="enableThirdPartyIntegrations"
                    checked={formData.integrations.enableThirdPartyIntegrations}
                    onCheckedChange={(checked) => handleInputChange('integrations', 'enableThirdPartyIntegrations', checked)}
                  />
                  <Label htmlFor="enableThirdPartyIntegrations">Enable Third-Party Integrations</Label>
                </div>
              </div>
            </TabsContent>
            
            {/* Implementation Task Templates */}
            <TabsContent value="templates" className="space-y-4">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium">Implementation Task Templates</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure task templates for implementation activities
                  </p>
                  <Separator className="my-4" />
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="defaultTaskType">Default Task Type</Label>
                        <Input 
                          id="defaultTaskType" 
                          value={formData.templates.defaultTaskType} 
                          onChange={(e) => handleInputChange('templates', 'defaultTaskType', e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="defaultComplexity">Default Complexity</Label>
                        <Select 
                          value={formData.templates.defaultComplexity} 
                          onValueChange={(value) => handleInputChange('templates', 'defaultComplexity', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select complexity" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="enableTemplateLibrary"
                        checked={formData.templates.enableTemplateLibrary}
                        onCheckedChange={(checked) => handleInputChange('templates', 'enableTemplateLibrary', checked)}
                      />
                      <Label htmlFor="enableTemplateLibrary">Enable Template Library</Label>
                    </div>
                    
                    <div className="space-y-4 mt-6">
                      <h4 className="text-md font-medium">Defined Templates</h4>
                      
                      {formData.templates.implementationTaskTemplates.map((template, index) => (
                        <Card key={index} className="p-4">
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor={`template-${index}-name`}>Template Name</Label>
                                <Input 
                                  id={`template-${index}-name`} 
                                  value={template.name} 
                                  onChange={(e) => {
                                    const updatedTemplates = [...formData.templates.implementationTaskTemplates];
                                    updatedTemplates[index] = { ...template, name: e.target.value };
                                    handleInputChange('templates', 'implementationTaskTemplates', updatedTemplates);
                                  }}
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor={`template-${index}-taskType`}>Task Type</Label>
                                <Input 
                                  id={`template-${index}-taskType`} 
                                  value={template.taskType} 
                                  onChange={(e) => {
                                    const updatedTemplates = [...formData.templates.implementationTaskTemplates];
                                    updatedTemplates[index] = { ...template, taskType: e.target.value };
                                    handleInputChange('templates', 'implementationTaskTemplates', updatedTemplates);
                                  }}
                                />
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor={`template-${index}-description`}>Description</Label>
                              <Input 
                                id={`template-${index}-description`} 
                                value={template.description} 
                                onChange={(e) => {
                                  const updatedTemplates = [...formData.templates.implementationTaskTemplates];
                                  updatedTemplates[index] = { ...template, description: e.target.value };
                                  handleInputChange('templates', 'implementationTaskTemplates', updatedTemplates);
                                }}
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor={`template-${index}-estimatedHours`}>Estimated Hours</Label>
                                <Input 
                                  id={`template-${index}-estimatedHours`} 
                                  type="number"
                                  min={0.5}
                                  step={0.5}
                                  value={template.estimatedHours} 
                                  onChange={(e) => {
                                    const updatedTemplates = [...formData.templates.implementationTaskTemplates];
                                    updatedTemplates[index] = { ...template, estimatedHours: parseFloat(e.target.value) };
                                    handleInputChange('templates', 'implementationTaskTemplates', updatedTemplates);
                                  }}
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor={`template-${index}-complexity`}>Complexity</Label>
                                <Select 
                                  value={template.complexity} 
                                  onValueChange={(value) => {
                                    const updatedTemplates = [...formData.templates.implementationTaskTemplates];
                                    updatedTemplates[index] = { ...template, complexity: value as 'low' | 'medium' | 'high' };
                                    handleInputChange('templates', 'implementationTaskTemplates', updatedTemplates);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select complexity" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor={`template-${index}-steps`}>Implementation Steps</Label>
                              <div className="border rounded-md p-2 space-y-2">
                                {template.implementationSteps.map((step, stepIndex) => (
                                  <div key={stepIndex} className="flex items-center gap-2">
                                    <Input 
                                      value={step} 
                                      onChange={(e) => {
                                        const updatedTemplates = [...formData.templates.implementationTaskTemplates];
                                        const updatedSteps = [...template.implementationSteps];
                                        updatedSteps[stepIndex] = e.target.value;
                                        updatedTemplates[index] = { ...template, implementationSteps: updatedSteps };
                                        handleInputChange('templates', 'implementationTaskTemplates', updatedTemplates);
                                      }}
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        const updatedTemplates = [...formData.templates.implementationTaskTemplates];
                                        const updatedSteps = template.implementationSteps.filter((_, i) => i !== stepIndex);
                                        updatedTemplates[index] = { ...template, implementationSteps: updatedSteps };
                                        handleInputChange('templates', 'implementationTaskTemplates', updatedTemplates);
                                      }}
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const updatedTemplates = [...formData.templates.implementationTaskTemplates];
                                    const updatedSteps = [...template.implementationSteps, ''];
                                    updatedTemplates[index] = { ...template, implementationSteps: updatedSteps };
                                    handleInputChange('templates', 'implementationTaskTemplates', updatedTemplates);
                                  }}
                                >
                                  Add Step
                                </Button>
                              </div>
                            </div>
                            
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                const updatedTemplates = formData.templates.implementationTaskTemplates.filter((_, i) => i !== index);
                                handleInputChange('templates', 'implementationTaskTemplates', updatedTemplates);
                              }}
                            >
                              Remove Template
                            </Button>
                          </div>
                        </Card>
                      ))}
                      
                      <Button
                        variant="outline"
                        onClick={() => {
                          const newTemplate: TaskTemplate = {
                            name: 'New Template',
                            description: 'Description for new template',
                            estimatedHours: 4,
                            complexity: 'medium',
                            taskType: 'implementation',
                            implementationSteps: ['Step 1']
                          };
                          const updatedTemplates = [...formData.templates.implementationTaskTemplates, newTemplate];
                          handleInputChange('templates', 'implementationTaskTemplates', updatedTemplates);
                        }}
                      >
                        Add New Template
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* Project Role Templates */}
            <TabsContent value="roleTemplates" className="space-y-4">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium">Project Role Templates</h3>
                  <Separator className="my-4" />
                  
                  <div className="space-y-6 mt-6">
                    <h4 className="text-md font-medium">Available Role Templates</h4>
                    
                    {formData.templates.projectRoleTemplates?.map((template, index) => (
                      <Card key={index} className="p-4">
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor={`role-template-${index}-name`}>Role Name</Label>
                              <Input 
                                id={`role-template-${index}-name`}
                                value={template.name} 
                                onChange={(e) => {
                                  const updatedTemplates = [...(formData.templates.projectRoleTemplates || [])];
                                  updatedTemplates[index] = { ...template, name: e.target.value };
                                  handleInputChange('templates', 'projectRoleTemplates', updatedTemplates);
                                }}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor={`role-template-${index}-roleType`}>Role Type</Label>
                              <Select 
                                value={template.roleType}
                                onValueChange={(value) => {
                                  const updatedTemplates = [...(formData.templates.projectRoleTemplates || [])];
                                  updatedTemplates[index] = { ...template, roleType: value };
                                  handleInputChange('templates', 'projectRoleTemplates', updatedTemplates);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select role type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Developer">Developer</SelectItem>
                                  <SelectItem value="QA">QA</SelectItem>
                                  <SelectItem value="Business Analyst">Business Analyst</SelectItem>
                                  <SelectItem value="Project Manager">Project Manager</SelectItem>
                                  <SelectItem value="DevOps">DevOps</SelectItem>
                                  <SelectItem value="Designer">Designer</SelectItem>
                                  <SelectItem value="Technical Lead">Technical Lead</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor={`role-template-${index}-locationType`}>Location Type</Label>
                              <Select 
                                value={template.locationType}
                                onValueChange={(value) => {
                                  const updatedTemplates = [...(formData.templates.projectRoleTemplates || [])];
                                  updatedTemplates[index] = { ...template, locationType: value };
                                  handleInputChange('templates', 'projectRoleTemplates', updatedTemplates);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select location type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Onshore">Onshore</SelectItem>
                                  <SelectItem value="Offshore">Offshore</SelectItem>
                                  <SelectItem value="Nearshore">Nearshore</SelectItem>
                                  <SelectItem value="Remote">Remote</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor={`role-template-${index}-seniorityLevel`}>Seniority Level</Label>
                              <Select 
                                value={template.seniorityLevel}
                                onValueChange={(value) => {
                                  const updatedTemplates = [...(formData.templates.projectRoleTemplates || [])];
                                  updatedTemplates[index] = { ...template, seniorityLevel: value };
                                  handleInputChange('templates', 'projectRoleTemplates', updatedTemplates);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select seniority level" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Junior">Junior</SelectItem>
                                  <SelectItem value="Mid-Level">Mid-Level</SelectItem>
                                  <SelectItem value="Senior">Senior</SelectItem>
                                  <SelectItem value="Principal">Principal</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`role-template-${index}-description`}>Description</Label>
                            <Input 
                              id={`role-template-${index}-description`}
                              value={template.description} 
                              onChange={(e) => {
                                const updatedTemplates = [...(formData.templates.projectRoleTemplates || [])];
                                updatedTemplates[index] = { ...template, description: e.target.value };
                                handleInputChange('templates', 'projectRoleTemplates', updatedTemplates);
                              }}
                            />
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor={`role-template-${index}-costRate`}>Cost Rate</Label>
                              <Input 
                                id={`role-template-${index}-costRate`}
                                value={template.costRate} 
                                onChange={(e) => {
                                  const updatedTemplates = [...(formData.templates.projectRoleTemplates || [])];
                                  updatedTemplates[index] = { ...template, costRate: e.target.value };
                                  handleInputChange('templates', 'projectRoleTemplates', updatedTemplates);
                                }}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor={`role-template-${index}-costUnit`}>Cost Unit</Label>
                              <Select 
                                value={template.costUnit}
                                onValueChange={(value) => {
                                  const updatedTemplates = [...(formData.templates.projectRoleTemplates || [])];
                                  updatedTemplates[index] = { ...template, costUnit: value };
                                  handleInputChange('templates', 'projectRoleTemplates', updatedTemplates);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select cost unit" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Hour">Hour</SelectItem>
                                  <SelectItem value="Day">Day</SelectItem>
                                  <SelectItem value="Week">Week</SelectItem>
                                  <SelectItem value="Month">Month</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor={`role-template-${index}-currency`}>Currency</Label>
                              <Select 
                                value={template.currency}
                                onValueChange={(value) => {
                                  const updatedTemplates = [...(formData.templates.projectRoleTemplates || [])];
                                  updatedTemplates[index] = { ...template, currency: value };
                                  handleInputChange('templates', 'projectRoleTemplates', updatedTemplates);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="USD">USD</SelectItem>
                                  <SelectItem value="EUR">EUR</SelectItem>
                                  <SelectItem value="GBP">GBP</SelectItem>
                                  <SelectItem value="CAD">CAD</SelectItem>
                                  <SelectItem value="AUD">AUD</SelectItem>
                                  <SelectItem value="INR">INR</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Switch 
                              id={`role-template-${index}-isActive`}
                              checked={template.isActive}
                              onCheckedChange={(checked) => {
                                const updatedTemplates = [...(formData.templates.projectRoleTemplates || [])];
                                updatedTemplates[index] = { ...template, isActive: checked };
                                handleInputChange('templates', 'projectRoleTemplates', updatedTemplates);
                              }}
                            />
                            <Label htmlFor={`role-template-${index}-isActive`}>Active</Label>
                          </div>
                          
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              const updatedTemplates = (formData.templates.projectRoleTemplates || []).filter((_, i) => i !== index);
                              handleInputChange('templates', 'projectRoleTemplates', updatedTemplates);
                            }}
                          >
                            Remove Template
                          </Button>
                        </div>
                      </Card>
                    ))}
                    
                    <Button
                      variant="outline"
                      onClick={() => {
                        const newId = `template-${Date.now().toString(36)}`;
                        const newTemplate: ProjectRoleTemplate = {
                          id: newId,
                          name: 'New Role Template',
                          roleType: 'Developer',
                          locationType: 'Onshore',
                          seniorityLevel: 'Mid-Level',
                          description: 'Description for new role template',
                          costRate: '100',
                          costUnit: 'Hour',
                          currency: 'USD',
                          isActive: true
                        };
                        const updatedTemplates = [...(formData.templates.projectRoleTemplates || []), newTemplate];
                        handleInputChange('templates', 'projectRoleTemplates', updatedTemplates);
                      }}
                    >
                      Add New Role Template
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* User Management */}
            <TabsContent value="users" className="space-y-4">
              <UserManagement />
            </TabsContent>
          </Tabs>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handleReset}>
          Reset
        </Button>
        <Button 
          type="submit"
          form="app-settings-form"
          disabled={updateSettingsMutation.isPending}
        >
          {updateSettingsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          Save Settings
        </Button>
      </CardFooter>
    </Card>
  );
}