
import React, { useState, useEffect, useRef } from 'react'; // 确保有 React
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Check, X, ChevronDown } from "lucide-react";

// Google search box styled CategoryCombobox component
const CategoryCombobox = ({
  value,
  onChange,
  options,
  placeholder,
  maxLength = 50,
  className = "",
  autoFocus = false,
  showActions = false,
  onSave = null,
  onCancel = null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [filteredOptions, setFilteredOptions] = useState(options);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    setFilteredOptions(options);
  }, [options]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        if (showActions && onCancel) {
          onCancel();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showActions, onCancel]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setIsOpen(true);

    // Filter options
    if (newValue.trim()) {
      const filtered = options.filter(opt =>
        opt.toLowerCase().includes(newValue.toLowerCase())
      );
      setFilteredOptions(filtered);
    } else {
      setFilteredOptions(options);
    }
    setHighlightedIndex(-1);
  };

  const handleOptionClick = (option) => {
    setInputValue(option);
    onChange(option);
    setIsOpen(false);
  };

  const handleFocus = () => {
    setIsOpen(true);
    setFilteredOptions(options);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setHighlightedIndex(-1);
      if (showActions && onCancel) {
        onCancel();
      }
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleOptionClick(filteredOptions[highlightedIndex]);
    } else if (e.key === 'Enter' && highlightedIndex === -1 && showActions && onSave) {
      e.preventDefault();
      onSave();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev =>
        prev < filteredOptions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
    }
  };

  const handleSaveClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onSave) {
      onSave();
    }
  };

  const handleCancelClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={maxLength}
          autoFocus={autoFocus}
          className={`w-full px-4 py-2.5 text-sm border border-gray-300 rounded-full focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm hover:shadow-md ${
            showActions ? 'pr-20' : 'pr-10'
          }`}
        />
        {showActions ? (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            <button
              type="button"
              onClick={handleSaveClick}
              className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <Check className="h-4 w-4 text-green-600" />
            </button>
            <button
              type="button"
              onClick={handleCancelClick}
              className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="h-4 w-4 text-red-600" />
            </button>
          </div>
        ) : (
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        )}
      </div>
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {filteredOptions.map((option, index) => (
            <div
              key={index}
              className={`px-4 py-2.5 cursor-pointer text-sm transition-colors ${
                index === highlightedIndex
                  ? 'bg-gray-100'
                  : 'hover:bg-gray-50'
              } ${index === 0 ? 'rounded-t-lg' : ''} ${index === filteredOptions.length - 1 ? 'rounded-b-lg' : ''}`}
              onClick={() => handleOptionClick(option)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {option}
            </div>
          ))}
        </div>
      )}
      {isOpen && filteredOptions.length === 0 && inputValue.trim() && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-2.5 text-sm text-gray-500">
          Press Enter to create "{inputValue}"
        </div>
      )}
    </div>
  );
};

// A simple component to show when access is denied.
const AccessDenied = () => (
  <div className="container mx-auto p-4 text-center">
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Access Denied</CardTitle>
      </CardHeader>
      <CardContent>
        <p>You do not have the required permissions to view this page. Please contact an administrator if you believe this is an error.</p>
      </CardContent>
    </Card>
  </div>
);

const KnowledgePage = () => {
  const supabase = useSupabaseClient();
  const session = useSession();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(true);

  const [knowledge, setKnowledge] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isIngestDialogOpen, setIsIngestDialogOpen] = useState(false);

  const [newKnowledgeTitle, setNewKnowledgeTitle] = useState('');
  const [newKnowledgeContent, setNewKnowledgeContent] = useState('');
  const [newKnowledgeCategory, setNewKnowledgeCategory] = useState('');

  const [ingestFile, setIngestFile] = useState(null);
  const [ingestCategory, setIngestCategory] = useState('');

  const { toast } = useToast();

  // Dynamic categories from database
  const defaultCategories = ['General', 'Communication', 'Psychology', 'Relationships', 'Product FAQ'];
  const [availableCategories, setAvailableCategories] = useState(defaultCategories);

  // Inline edit state
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingCategory, setEditingCategory] = useState('');

  const [expandedFiles, setExpandedFiles] = useState({}); // { file_id: { isExpanded, chunks } }
  const [loadingChunks, setLoadingChunks] = useState({});

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSessionLoading(false);
    };
    
    checkSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (sessionLoading) {
      return;
    }

    setIsAuthLoading(true);
    
    const checkAdminRole = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const user = currentSession?.user;
      
      if (!user) {
        setIsAdmin(false);
        setIsAuthLoading(false);
        return;
      }
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (profile && profile.role === 'admin') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      setIsAuthLoading(false);
    };

    checkAdminRole();
  }, [sessionLoading, supabase]);

  useEffect(() => {
    if (isAdmin) {
      fetchKnowledge();
      fetchAvailableCategories();
      const channel = supabase
        .channel('knowledge_uploads_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'knowledge_uploads' }, (payload) => {
          fetchKnowledge();
          fetchAvailableCategories();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAdmin, supabase]);

  // Set default category when availableCategories loads
  useEffect(() => {
    if (availableCategories.length > 0) {
      if (!newKnowledgeCategory) {
        setNewKnowledgeCategory(availableCategories[0]);
      }
      if (!ingestCategory) {
        setIngestCategory(availableCategories[0]);
      }
    }
  }, [availableCategories]);

  const fetchKnowledge = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('knowledge_uploads')
      .select(`
        id,
        file_name,
        status,
        created_at,
        category:metadata->category,
        source:metadata->source,
        type:metadata->type,
        processed_chunks:metadata->processed_chunks,
        chunks_count:metadata->chunks_count
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ variant: "destructive", title: "Error fetching knowledge", description: error.message });
    } else {
      // Restructure data to maintain compatibility with existing code
      const restructuredData = data?.map(item => ({
        id: item.id,
        file_name: item.file_name,
        status: item.status,
        created_at: item.created_at,
        metadata: {
          category: item.category,
          source: item.source,
          type: item.type,
          processed_chunks: item.processed_chunks,
          chunks_count: item.chunks_count
        }
      })) || [];
      setKnowledge(restructuredData);
    }
    setIsLoading(false);
  };

  const fetchAvailableCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('knowledge_uploads')
        .select('category:metadata->category')
        .eq('is_active', true);

      if (error) throw error;

      // Extract unique categories
      const categories = new Set(defaultCategories);
      data?.forEach(item => {
        const category = item.category;
        if (category && typeof category === 'string' && category.trim()) {
          categories.add(category);
        }
      });

      setAvailableCategories(Array.from(categories).sort());
    } catch (error) {
      console.error('Error fetching categories:', error);
      setAvailableCategories(defaultCategories);
    }
  };

  const fetchChunks = async (fileId) => {
    setLoadingChunks(prev => ({ ...prev, [fileId]: true }));
    try {
        const { data, error } = await supabase
            .from('knowledge_vectors')
            .select('id, content, metadata, created_at')
            .eq('metadata->>file_id', fileId)
            .eq('is_active', true);

        if (error) throw error;

        const sortedChunks = (data || []).sort((a, b) => {
            const indexA = a.metadata?.chunk_index || 0;
            const indexB = b.metadata?.chunk_index || 0;
            return indexA - indexB;
        });
        
        setExpandedFiles(prev => ({
            ...prev,
            [fileId]: {
                isExpanded: true,
                chunks: sortedChunks
            }
        }));
    } catch (error) {
        toast({ 
            variant: "destructive", 
            title: "Error loading chunks", 
            description: error.message 
        });
    } finally {
        setLoadingChunks(prev => ({ ...prev, [fileId]: false }));
    }
  };

  const toggleFileExpansion = async (fileId) => {
      if (expandedFiles[fileId]?.isExpanded) {
          setExpandedFiles(prev => ({
              ...prev,
              [fileId]: { ...prev[fileId], isExpanded: false }
          }));
      } else if (expandedFiles[fileId]?.chunks) {
          setExpandedFiles(prev => ({
              ...prev,
              [fileId]: { ...prev[fileId], isExpanded: true }
          }));
      } else {
          await fetchChunks(fileId);
      }
  };

  const handleAddNew = async () => {
    if (!newKnowledgeTitle || !newKnowledgeContent || !newKnowledgeCategory) {
      toast({ variant: "destructive", title: "Error", description: "Title, content and category are required." });
      return;
    }
    
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated. Please log in again.");
      }

      const timestamp = Date.now();
      const uuid = crypto.randomUUID();
      const sanitizedTitle = newKnowledgeTitle
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_+|_+$/g, '');
      const storagePath = `admin/manual/${timestamp}-${uuid}-${sanitizedTitle}.txt`;

      const encoder = new TextEncoder();
      const fileSize = encoder.encode(newKnowledgeContent).length;

      const { error: insertError } = await supabase
        .from('knowledge_uploads')
        .insert({
          user_id: session.user.id,
          file_name: newKnowledgeTitle,
          file_size: fileSize,
          storage_path: storagePath,
          status: 'pending',
          storage_provider: 'manual_entry',
          metadata: {
            source: 'manual_entry',
            category: newKnowledgeCategory,
            manual_content: newKnowledgeContent
          }
        });

      if (insertError) {
        throw new Error(`Failed to save: ${insertError.message}`);
      }

      toast({ 
        title: "Success", 
        description: "Knowledge is being processed. Status will update shortly." 
      });
      
      setIsAddDialogOpen(false);
      setNewKnowledgeTitle('');
      setNewKnowledgeContent('');
      fetchKnowledge();

    } catch (error) {
      console.error("Add Manual Error:", error);
      toast({ variant: "destructive", title: "Save Failed", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleIngestData = async () => {
    if (!ingestFile || !ingestCategory) {
        toast({ variant: "destructive", title: "Error", description: "File and category are required." });
        return;
    }
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated. Please log in again.");
      }
      const accessToken = session.access_token;

      const response = await fetch('/api/generate-upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          fileName: ingestFile.name,
          fileType: ingestFile.type,
          fileSize: ingestFile.size,
          uploadContext: 'admin_knowledge'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to get upload URL.');
      }

      const { uploadUrl, storagePath } = await response.json();

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: ingestFile,
        headers: {
          'Content-Type': ingestFile.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to R2.');
      }

      const { error: updateError } = await supabase
        .from('knowledge_uploads')
        .update({ 
          metadata: { 
            source: 'file_upload', 
            category: ingestCategory, 
            type: ingestFile.name.split('.').pop()
          }
        })
        .eq('storage_path', storagePath);

      if (updateError) {
        throw new Error(`Failed to update metadata: ${updateError.message}`);
      }

      toast({ title: "Upload Successful", description: `File is being processed. Status will update shortly.` });
      setIsIngestDialogOpen(false);
      setIngestFile(null);
      fetchKnowledge(); // Refresh the list

    } catch (error) {
      console.error("Ingestion Error:", error);
      toast({ variant: "destructive", title: "Upload Failed", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartEdit = (itemId, currentCategory) => {
    setEditingItemId(itemId);
    setEditingCategory(currentCategory || '');
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditingCategory('');
  };

  const handleSaveCategory = async (itemId) => {
    const trimmedCategory = editingCategory.trim();

    // Validation
    if (!trimmedCategory) {
      toast({ variant: "destructive", title: "Error", description: "Category cannot be empty" });
      return;
    }

    if (trimmedCategory.length > 50) {
      toast({ variant: "destructive", title: "Error", description: "Category name must be 50 characters or less" });
      return;
    }

    try {
      const item = knowledge.find(k => k.id === itemId);
      if (!item) return;

      const updatedMetadata = {
        ...item.metadata,
        category: trimmedCategory
      };

      const { error } = await supabase
        .from('knowledge_uploads')
        .update({ metadata: updatedMetadata })
        .eq('id', itemId);

      if (error) throw error;

      toast({ title: "Success", description: "Category updated successfully" });
      setEditingItemId(null);
      setEditingCategory('');
      fetchKnowledge();
      fetchAvailableCategories();
    } catch (error) {
      console.error('Error updating category:', error);
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this knowledge item? This will also remove all related vectors.')) {
      return;
    }

    try {
      // Use RPC function to handle cascade soft delete
      const { data, error } = await supabase
        .rpc('soft_delete_knowledge_upload', { p_upload_id: id });

      if (error) {
        toast({ variant: "destructive", title: "Error deleting item", description: error.message });
        return;
      }

      // data contains [{upload_updated: true, vectors_updated: count}]
      const vectorsCount = data?.[0]?.vectors_updated || 0;

      toast({
        title: "Success",
        description: `Knowledge item deleted. ${vectorsCount} related vector(s) also removed.`
      });
      fetchKnowledge();
    } catch (error) {
      toast({ variant: "destructive", title: "Delete operation failed", description: error.message });
    }
  }
  
  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  }

  if (sessionLoading || isAuthLoading) {
    return (
      <div className="container mx-auto p-4 text-center">
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
          <p>Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <AccessDenied />;
  }

  return (
    <div className="w-full min-h-screen p-4 md:p-6 lg:p-8">
      <Card className="w-full">
          <CardHeader>
              <div className="flex justify-between items-center">
                  <div>
                  <CardTitle>Knowledge Base</CardTitle>
                  <CardDescription>Manage your public knowledge articles here. Status updates in real-time.</CardDescription>
                  </div>
                  <div className="flex space-x-2">
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                      <DialogTrigger asChild><Button>Add Manually</Button></DialogTrigger>
                      <DialogContent className="sm:max-w-[600px] bg-white">
                      <DialogHeader><DialogTitle>Add New Knowledge</DialogTitle></DialogHeader>
                      <DialogDescription>
                          Manually add a new piece of knowledge. This will be processed and embedded like a file.
                      </DialogDescription>
                      <div className="grid gap-4 py-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Title (required)</label>
                          <Input 
                            placeholder="Enter a title for this knowledge entry..."
                            value={newKnowledgeTitle}
                            onChange={(e) => setNewKnowledgeTitle(e.target.value)}
                          />
                        </div>
                        <Textarea 
                          placeholder="Enter knowledge content here..."
                          value={newKnowledgeContent} 
                          onChange={(e) => setNewKnowledgeContent(e.target.value)}
                          rows={10}
                        />
                        <div>
                          <label className="text-sm font-medium mb-2 block">Category</label>
                          <CategoryCombobox
                            value={newKnowledgeCategory}
                            onChange={setNewKnowledgeCategory}
                            options={availableCategories}
                            placeholder="Select or type category..."
                            maxLength={50}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                          <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                          <Button onClick={handleAddNew} disabled={isLoading || !newKnowledgeTitle || !newKnowledgeContent}>
                            {isLoading ? 'Saving...' : 'Save Knowledge'}
                          </Button>
                      </DialogFooter>
                      </DialogContent>
                  </Dialog>
                  <Dialog open={isIngestDialogOpen} onOpenChange={setIsIngestDialogOpen}>
                      <DialogTrigger asChild><Button>Ingest from File</Button></DialogTrigger>
                      <DialogContent className="sm:max-w-[425px] bg-white">
                      <DialogHeader><DialogTitle>Ingest Data from File</DialogTitle></DialogHeader>
                      <DialogDescription>
                          Upload a file (.txt, .md, .docx, .pdf) to be added to the knowledge base.
                      </DialogDescription>
                      <div className="grid gap-4 py-4">
                          <Input type="file" onChange={(e) => setIngestFile(e.target.files[0])} accept=".txt,.md,.docx,.pdf" />
                          <div>
                            <label className="text-sm font-medium mb-2 block">Category</label>
                            <CategoryCombobox
                              value={ingestCategory}
                              onChange={setIngestCategory}
                              options={availableCategories}
                              placeholder="Select or type category..."
                              maxLength={50}
                            />
                          </div>
                      </div>
                      <DialogFooter>
                          <Button variant="outline" onClick={() => setIsIngestDialogOpen(false)}>Cancel</Button>
                          <Button onClick={handleIngestData} disabled={isLoading || !ingestFile}>{isLoading ? 'Uploading...' : 'Start Ingestion'}</Button>
                      </DialogFooter>
                      </DialogContent>
                  </Dialog>
                  </div>
              </div>
          </CardHeader>
          <CardContent className="overflow-visible">
            <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">Loading data...</TableCell>
                  </TableRow>
                ) : knowledge.length > 0 ? (
                  knowledge.map((item) => (
                    <React.Fragment key={item.id}>
                      <TableRow>
                        <TableCell>
                          <button
                            onClick={() => toggleFileExpansion(item.id)}
                            className="text-blue-600 hover:text-blue-800 underline text-left"
                          >
                            {item.file_name}
                          </button>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(item.status)}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {editingItemId === item.id ? (
                            <CategoryCombobox
                              value={editingCategory}
                              onChange={setEditingCategory}
                              options={availableCategories}
                              placeholder="Select or type category..."
                              maxLength={50}
                              autoFocus={true}
                              showActions={true}
                              onSave={() => handleSaveCategory(item.id)}
                              onCancel={handleCancelEdit}
                            />
                          ) : (
                            <button
                              className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                              onClick={() => handleStartEdit(item.id, item.metadata?.category)}
                            >
                              {item.metadata?.category || 'N/A'}
                            </button>
                          )}
                        </TableCell>
                        <TableCell>{item.metadata?.source === 'manual_entry' ? 'Manual Entry' : (item.metadata?.type || 'N/A')}</TableCell>
                        <TableCell>{new Date(item.created_at).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleDelete(item.id)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                      
                      {expandedFiles[item.id]?.isExpanded && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-gray-50 p-4">
                            {loadingChunks[item.id] ? (
                              <p className="text-center text-gray-500">Loading chunks...</p>
                            ) : expandedFiles[item.id]?.chunks?.length > 0 ? (
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm mb-2">
                                  Chunks ({expandedFiles[item.id].chunks.length})
                                </h4>
                                {expandedFiles[item.id].chunks.map((chunk, idx) => (
                                  <div 
                                    key={chunk.id} 
                                    className="border rounded p-3 bg-white"
                                  >
                                    <div className="flex justify-between items-start mb-1">
                                      <span className="text-xs font-medium text-gray-600">
                                        Chunk {idx + 1}
                                      </span>
                                      <span className="text-xs text-gray-400">
                                        {new Date(chunk.created_at).toLocaleString()}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                      {chunk.content}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-center text-gray-500">No chunks found</p>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">No knowledge items found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </CardContent>
      </Card>
    </div>
  );
};

export default KnowledgePage;

export async function getServerSideProps(context) {
  const { createPagesServerClient } = require('@supabase/auth-helpers-nextjs');
  
  const supabase = createPagesServerClient(context);
  
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  return {
    props: {
      initialSession: session,
    },
  };
}
