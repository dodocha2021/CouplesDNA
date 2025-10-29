
import React, { useState, useEffect } from 'react'; // 确保有 React
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
  const [newKnowledgeCategory, setNewKnowledgeCategory] = useState('General');
  
  const [ingestFile, setIngestFile] = useState(null);
  const [ingestCategory, setIngestCategory] = useState('General');

  const { toast } = useToast();

  const knowledgeCategories = ['General', 'Communication', 'Psychology', 'Relationships', 'Product FAQ'];
  
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
      const channel = supabase
        .channel('knowledge_uploads_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'knowledge_uploads' }, (payload) => {
          fetchKnowledge();
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAdmin, supabase]);

  const fetchKnowledge = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('knowledge_uploads')
      .select('id, file_name, status, metadata, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ variant: "destructive", title: "Error fetching knowledge", description: error.message });
    } else {
      setKnowledge(data);
    }
    setIsLoading(false);
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
    <div className="container mx-auto p-4">
      <Card>
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
                        <Select value={newKnowledgeCategory} onValueChange={setNewKnowledgeCategory}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-white">
                            {knowledgeCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                            </SelectContent>
                        </Select>
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
                          <Select value={ingestCategory} onValueChange={setIngestCategory}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent className="bg-white">
                              {knowledgeCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                              </SelectContent>
                          </Select>
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
          <CardContent>
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
                        <TableCell>{item.metadata?.category || 'N/A'}</TableCell>
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
