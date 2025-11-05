import React, { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Eye, Trash2 } from "lucide-react";

const SystemDefaultConfiguration = () => {
  const supabase = useSupabaseClient();
  const { toast } = useToast();

  // Registered settings list
  const [registeredSettings, setRegisteredSettings] = useState([]);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);

  // Available templates (completed slides that can be registered)
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  // Register form
  const [settingName, setSettingName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // View details dialog
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingConfig, setViewingConfig] = useState(null);

  // Fetch registered settings (is_system_default = true)
  const fetchRegisteredSettings = async () => {
    setIsLoadingSettings(true);
    try {
      const { data, error } = await supabase
        .from('prompt_configs')
        .select('id, setting_name, name, report_topic, model_selection, created_at, updated_at')
        .eq('prompt_type', 'slide')
        .eq('is_system_default', true)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRegisteredSettings(data || []);
    } catch (error) {
      console.error('Error fetching registered settings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load registered settings"
      });
    } finally {
      setIsLoadingSettings(false);
    }
  };

  // Fetch available templates (completed slides not yet registered)
  const fetchAvailableTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from('prompt_configs')
        .select('id, name, report_topic, model_selection, created_at')
        .eq('prompt_type', 'slide')
        .eq('manus_task_status', 'completed')
        .eq('is_system_default', false)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAvailableTemplates(data || []);
    } catch (error) {
      console.error('Error fetching available templates:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load available templates"
      });
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  // Register new setting
  const handleRegister = async () => {
    if (!settingName.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter a setting name"
      });
      return;
    }

    if (!selectedTemplateId) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select a template"
      });
      return;
    }

    setIsRegistering(true);
    try {
      const { error } = await supabase
        .from('prompt_configs')
        .update({
          setting_name: settingName.trim(),
          is_system_default: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTemplateId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Setting registered successfully"
      });

      // Reset form
      setSettingName('');
      setSelectedTemplateId('');

      // Refresh lists
      fetchRegisteredSettings();
      fetchAvailableTemplates();
    } catch (error) {
      console.error('Error registering setting:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to register setting"
      });
    } finally {
      setIsRegistering(false);
    }
  };

  // Delete (unregister) setting
  const handleDelete = async (id, settingName) => {
    if (!confirm(`Are you sure you want to unregister "${settingName}"? This will hide it from the My Reports topic selection.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('prompt_configs')
        .update({
          is_system_default: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Setting unregistered successfully"
      });

      // Refresh lists
      fetchRegisteredSettings();
      fetchAvailableTemplates();
    } catch (error) {
      console.error('Error deleting setting:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to unregister setting"
      });
    }
  };

  // View details
  const handleView = async (id) => {
    try {
      const { data, error } = await supabase
        .from('prompt_configs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setViewingConfig(data);
      setViewDialogOpen(true);
    } catch (error) {
      console.error('Error fetching config details:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load configuration details"
      });
    }
  };

  // Initial load
  useEffect(() => {
    fetchRegisteredSettings();
    fetchAvailableTemplates();
  }, []);

  return (
    <div className="w-full space-y-6">
      {/* Registered Settings List */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Registered Settings</CardTitle>
          <CardDescription>
            These settings are available for users to select in My Reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSettings ? (
            <div className="text-center py-4">Loading...</div>
          ) : registeredSettings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No registered settings yet. Register a template below to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Setting Name</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registeredSettings.map((setting) => (
                  <TableRow key={setting.id}>
                    <TableCell className="font-medium">{setting.setting_name}</TableCell>
                    <TableCell><Badge variant="outline">{setting.model_selection}</Badge></TableCell>
                    <TableCell>{new Date(setting.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(setting.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(setting.id, setting.setting_name)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Register New Setting Form */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Register New Setting</CardTitle>
          <CardDescription>
            Select a completed slide template and give it a name. This name will be shown to users in My Reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Setting Name <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g., Communication Analysis, Relationship Insights..."
              value={settingName}
              onChange={(e) => setSettingName(e.target.value)}
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">
              This name will be shown to users when selecting a topic
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Select Template <span className="text-red-500">*</span>
            </label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a completed slide template..." />
              </SelectTrigger>
              <SelectContent>
                {isLoadingTemplates ? (
                  <SelectItem value="loading" disabled>Loading templates...</SelectItem>
                ) : availableTemplates.length === 0 ? (
                  <SelectItem value="empty" disabled>No available templates</SelectItem>
                ) : (
                  availableTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name || template.report_topic || `Template ${template.id.substring(0, 8)}`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Only completed slide templates are shown
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => {
                setSettingName('');
                setSelectedTemplateId('');
              }}
              variant="outline"
              disabled={isRegistering}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRegister}
              disabled={isRegistering || !settingName.trim() || !selectedTemplateId}
            >
              {isRegistering ? 'Registering...' : 'Register Setting'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configuration Details</DialogTitle>
            <DialogDescription>
              Read-only view of the configuration
            </DialogDescription>
          </DialogHeader>
          {viewingConfig && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold">Setting Name:</label>
                <p className="text-sm mt-1">{viewingConfig.setting_name}</p>
              </div>
              <div>
                <label className="text-sm font-semibold">Model:</label>
                <p className="text-sm mt-1">{viewingConfig.model_selection}</p>
              </div>
              <div>
                <label className="text-sm font-semibold">System Prompt:</label>
                <pre className="text-xs mt-1 p-2 bg-gray-50 rounded border overflow-x-auto">
                  {viewingConfig.system_prompt}
                </pre>
              </div>
              <div>
                <label className="text-sm font-semibold">User Prompt Template:</label>
                <pre className="text-xs mt-1 p-2 bg-gray-50 rounded border overflow-x-auto">
                  {viewingConfig.user_prompt_template}
                </pre>
              </div>
              <div>
                <label className="text-sm font-semibold">Configuration:</label>
                <div className="text-sm mt-1 space-y-1">
                  <p>Top K Results: {viewingConfig.top_k_results}</p>
                  <p>Strict Mode: {viewingConfig.strict_mode ? 'Enabled' : 'Disabled'}</p>
                  <p>Selected Knowledge IDs: {viewingConfig.selected_knowledge_ids?.length || 0} files</p>
                </div>
              </div>
              {viewingConfig.category_thresholds && Object.keys(viewingConfig.category_thresholds).length > 0 && (
                <div>
                  <label className="text-sm font-semibold">Category Thresholds:</label>
                  <pre className="text-xs mt-1 p-2 bg-gray-50 rounded border">
                    {JSON.stringify(viewingConfig.category_thresholds, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SystemDefaultConfiguration;
