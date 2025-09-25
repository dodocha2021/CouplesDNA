
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

const KnowledgeAdminPage = () => {
  const [knowledge, setKnowledge] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editedContent, setEditedContent] = useState('');

  const limit = 20; // Items per page

  const fetchKnowledge = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        page,
        limit,
        search,
        category,
      });
      const response = await fetch(`/api/knowledge?${queryParams}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setKnowledge(data.data || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.totalCount || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, category]);

  // Simplified fetch for categories - in a real app, this might be a separate endpoint
  const fetchCategories = async () => {
      // This is a placeholder. Ideally, you'd have an endpoint to get all distinct categories.
      // For now, we can derive it from the fetched knowledge if needed, or have a predefined list.
      // Example: GET /api/knowledge/categories
      setCategories(['Product Docs', 'Sales Scripts', 'FAQs']); // Placeholder
  }

  useEffect(() => {
    fetchKnowledge();
    fetchCategories();
  }, [fetchKnowledge]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1); // Reset to first page on new search
  };

  const handleCategoryChange = (value) => {
      setCategory(value);
      setPage(1);
  }

  const openEditModal = (item) => {
    setSelectedItem(item);
    setEditedContent(item.content);
    setIsEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedItem) return;
    try {
      const response = await fetch('/api/knowledge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedItem.id, content: editedContent }),
      });
      if (!response.ok) throw new Error('Failed to update');
      setIsEditModalOpen(false);
      fetchKnowledge(); // Refresh data
    } catch (e) {
      setError(e.message);
    }
  };

  const openDeleteModal = (item) => {
      setSelectedItem(item);
      setIsDeleteModalOpen(true);
  }

  const handleDelete = async () => {
    if (!selectedItem) return;
    try {
      const response = await fetch('/api/knowledge', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedItem.id }),
      });
      if (response.status !== 204) throw new Error('Failed to delete');
      setIsDeleteModalOpen(false);
      fetchKnowledge(); // Refresh data
    } catch (e) {
      setError(e.message);
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Knowledge Base Management</h1>
      
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-2">
            <Input
                placeholder="Search content..."
                value={search}
                onChange={handleSearchChange}
                className="max-w-sm"
            />
            <Select onValueChange={handleCategoryChange} value={category}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
        {/* Ingest button will be added later */}
      </div>

      {isLoading && <p>Loading...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Content</TableHead>
              <TableHead className="w-[150px]">Category</TableHead>
              <TableHead className="w-[200px]">Source</TableHead>
              <TableHead className="w-[180px]">Created At</TableHead>
              <TableHead className="text-right w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {knowledge.length > 0 ? (
              knowledge.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="truncate max-w-xs">{item.content}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell className="truncate max-w-[150px]">{item.source}</TableCell>
                  <TableCell>{new Date(item.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEditModal(item)}>Edit</Button>
                    <Button variant="destructive" size="sm" onClick={() => openDeleteModal(item)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center">No knowledge found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

        <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
                Total {totalCount} items
            </p>
            <div className="flex items-center space-x-2">
                <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                >
                    Previous
                </Button>
                <span>Page {page} of {totalPages}</span>
                <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                >
                    Next
                </Button>
            </div>
        </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Knowledge Chunk</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">Content</label>
            <Input
                id="content"
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="h-32"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the knowledge chunk.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    </div>
  );
};

export default KnowledgeAdminPage;

// This page should be protected. In a real app, you would wrap this
// with a HOC or use a hook to check for admin privileges.
// For example:
// export default withAdminAuth(KnowledgeAdminPage);
