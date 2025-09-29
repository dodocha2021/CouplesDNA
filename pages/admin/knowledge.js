
import { useState, useEffect } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'; // <-- 1. Import useUser
import { useRouter } from 'next/router'; // <-- 2. Import useRouter
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const KnowledgePage = () => {
  const supabase = useSupabaseClient();
  const user = useUser(); // <-- 3. Get the user object
  const router = useRouter(); // <-- 4. Get the router object

  const [knowledge, setKnowledge] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Start with true
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isIngestDialogOpen, setIsIngestDialogOpen] = useState(false);
  
  const [newKnowledgeContent, setNewKnowledgeContent] = useState('');
  const [newKnowledgeCategory, setNewKnowledgeCategory] = useState('General');
  
  const [ingestFile, setIngestFile] = useState(null);
  const [ingestCategory, setIngestCategory] = useState('General');

  const { toast } = useToast();

  const knowledgeCategories = ['General', 'Communication', 'Psychology', 'Relationships', 'Product FAQ'];

  // <-- 5. Add the authentication guard useEffect
  useEffect(() => {
    // If the user object is loaded and it's null, redirect to login
    if (user === null) {
       router.push('/login');
    }
  }, [user, router]);

  useEffect(() => {
    // Only fetch data if the user is logged in.
    if (user) {
      fetchKnowledge();
      
      const channel = supabase
        .channel('knowledge_uploads_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'knowledge_uploads' }, (payload) => {
          console.log('Change received!', payload);
          fetchKnowledge();
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, supabase]); // Depend on user

  const fetchKnowledge = async () => {
    // No need to set loading true here, handled by initial state
    const { data, error } = await supabase
      .from('knowledge_uploads')
      .select('id, file_name, status, metadata, created_at')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast({ variant: "destructive", title: "Error fetching knowledge", description: error.message });
    } else {
      setKnowledge(data);
    }
    setIsLoading(false); // Set loading to false after fetch
  };

  const handleAddNew = async () => {
    if (!newKnowledgeContent || !newKnowledgeCategory) {
      toast({ variant: "destructive", title: "Error", description: "Content and category are required." });
      return;
    }
    setIsLoading(true);
    
    const fileName = `manual-entry-${new Date().toISOString()}.txt`;
    const filePath = `admin/${fileName}`;
    const fileContent = new Blob([newKnowledgeContent], { type: 'text/plain' });
    const fileExtension = 'txt';

    const { error: uploadError } = await supabase.storage
        .from('couplesdnaupload')
        .upload(filePath, fileContent);

    if (uploadError) {
        toast({ variant: "destructive", title: "Error uploading manual entry", description: uploadError.message });
        setIsLoading(false);
        return;
    }

    const { error: insertError } = await supabase.from('knowledge_uploads').insert({ 
        file_name: fileName,
        storage_path: filePath,
        status: 'pending',
        metadata: {
            type: fileExtension,
            source: 'manual',
            category: newKnowledgeCategory,
        }
    });

    if (insertError) {
      toast({ variant: "destructive", title: "Error adding knowledge", description: insertError.message });
    } else {
      toast({ title: "Success", description: "New knowledge added and is being processed in the background." });
      setIsAddDialogOpen(false);
      setNewKnowledgeContent('');
    }
    setIsLoading(false);
  };

  const handleIngestData = async () => {
    if (!ingestFile || !ingestCategory) {
        toast({ variant: "destructive", title: "Error", description: "File and category are required." });
        return;
    }
    setIsLoading(true);

    const fileName = `${Date.now()}-${ingestFile.name}`;
    const filePath = `admin/${fileName}`;
    const fileExtension = ingestFile.name.split('.').pop();

    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('couplesdnaupload')
        .upload(filePath, ingestFile);

    if (uploadError) {
        toast({ variant: "destructive", title: "Error uploading file", description: uploadError.message });
        setIsLoading(false);
        return;
    }

    const { error: insertError } = await supabase.from('knowledge_uploads').insert({
        file_name: ingestFile.name,
        storage_path: uploadData.path,
        status: 'pending',
        metadata: {
            type: fileExtension,
            source: 'file_upload',
            category: ingestCategory,
        }
    });
    
    if (insertError) {
        toast({ variant: "destructive", title: "Error ingesting data", description: insertError.message });
    } else {
        toast({ title: "Upload Successful", description: `File is being processed in the background. Status will update shortly.` });
        setIsIngestDialogOpen(false);
        setIngestFile(null);
    }
    setIsLoading(false);
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('knowledge_uploads').delete().match({ id });
    if (error) {
      toast({ variant: "destructive", title: "Error deleting item", description: error.message });
    } else {
      toast({ title: "Success", description: "Knowledge item deleted." });
      fetchKnowledge();
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

  // Render a loading state or nothing while redirecting
  if (!user) {
    return <div className="container mx-auto p-4 text-center">Loading...</div>;
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
                    <Button onClick={handleAddNew} disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Knowledge'}</Button>
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
                <TableRow><TableCell colSpan={6} className="text-center">Loading data...</TableCell></TableRow>
              ) : knowledge.length > 0 ? (
                knowledge.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.file_name}</TableCell>
                  <TableCell><Badge variant={getStatusBadgeVariant(item.status)}>{item.status}</Badge></TableCell>
                  <TableCell><Badge>{item.metadata?.category || 'N/A'}</Badge></TableCell>
                  <TableCell><Badge variant="secondary">{item.metadata?.type || 'N/A'}</Badge></TableCell>
                   <TableCell>{new Date(item.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))
              ) : (
                <TableRow><TableCell colSpan={6} className="text-center">No knowledge items found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default KnowledgePage;
