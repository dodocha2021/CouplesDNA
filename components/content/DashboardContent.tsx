import React, { useState, useEffect, useRef } from "react";
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { ArrowUp, BarChart, MessageSquare, TrendingUp, Upload, CheckCircle2, AlertCircle, Loader2, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

// --- Interfaces for type safety ---
interface UploadedFile {
  id: string;
  file_name: string;
  status: 'pending' | 'processing' | 'processed' | 'failed';
  created_at: string;
  storage_path: string;
}

// --- Mock Data ---
const sentimentData = [ { month: "Jan", communication: 65, intimacy: 45 }, { month: "Feb", communication: 70, intimacy: 52 }, { month: "Mar", communication: 68, intimacy: 61 }, { month: "Apr", communication: 76, intimacy: 67 }, { month: "May", communication: 82, intimacy: 73 }, { month: "Jun", communication: 85, intimacy: 80 }, ];
const communicationStyleData = [ { subject: 'Constructive', value: 35, fullMark: 100 }, { subject: 'Supportive', value: 25, fullMark: 100 }, { subject: 'Direct', value: 20, fullMark: 100 }, { subject: 'Emotional', value: 15, fullMark: 100 }, { subject: 'Avoidant', value: 5, fullMark: 100 }, ];


// --- Main Dashboard Component ---
export default function DashboardContent() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Data Fetching and Real-time Updates ---
  useEffect(() => {
    const fetchUserFiles = async () => {
      setIsLoadingFiles(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoadingFiles(false);
        return;
      }
      const { data, error } = await supabase.from('user_uploads').select('*').eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching files:', error);
      } else {
        setUploadedFiles(data || []);
      }
      setIsLoadingFiles(false);
    };

    fetchUserFiles();

    const channel = supabase.channel('user_uploads_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_uploads' }, (payload) => {
         fetchUserFiles();
       })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // --- File Handling Logic with ENHANCED ERROR LOGGING ---
  const handleUpload = async (file: File) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("User is not authenticated. Please log in.");

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      const body = JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      });

      const response = await fetch('/api/generate-upload-url', {
        method: 'POST',
        headers: headers,
        body: body,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.statusText}`);
      }
      
      const { uploadUrl } = await response.json();

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadResponse.ok) {
        // Try to get more details from the failed upload response
        const errorText = await uploadResponse.text();
        throw new Error(`Cloud upload failed with status ${uploadResponse.status}. Response: ${errorText}`);
      }

    } catch (error) {
      // --- THIS IS THE NEW DIAGNOSTIC CODE ---
      console.error("--- DETAILED UPLOAD FAILURE ---");
      console.error("Error Name:", error.name);
      console.error("Error Message:", error.message);
      console.error("Error Cause (often contains the real CORS issue):", error.cause);
      console.error("Full Error Object:", error);
      alert(`Upload failed. See the browser's developer console (F12) for detailed technical information.`);
      // --- END OF DIAGNOSTIC CODE ---
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach(handleUpload);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file? This will also remove all related chat vectors.')) {
      return;
    }

    try {
      // Use RPC function to handle cascade soft delete
      const { data, error } = await supabase
        .rpc('soft_delete_user_upload', { p_upload_id: fileId });

      if (error) {
        console.error("Failed to delete:", error);
        alert(`Failed to delete file: ${error.message}`);
        return;
      }

      // data contains [{upload_updated: true, vectors_updated: count}]
      const vectorsCount = data?.[0]?.vectors_updated || 0;
      alert(`File deleted successfully. ${vectorsCount} related vector(s) also removed.`);
    } catch (error) {
      console.error("Delete operation failed:", error);
      alert('An error occurred during deletion.');
    }
  };
  
  const renderStatusIcon = (status: UploadedFile['status']) => {
      switch (status) {
          case 'pending': return <Loader2 className="h-3 w-3 text-gray-400 animate-spin" title="Pending" />;
          case 'processing': return <Loader2 className="h-3 w-3 text-blue-500 animate-spin" title="Processing" />;
          case 'processed': return <CheckCircle2 className="h-3 w-3 text-green-500" title="Processed" />;
          case 'failed': return <AlertCircle className="h-3 w-3 text-red-500" title="Failed" />;
          default: return null;
      }
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2"><h2 className="text-3xl font-bold tracking-tight">Dashboard</h2></div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Reports</CardTitle><BarChart className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">45</div><p className="text-xs text-muted-foreground">+5 since last month</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Average Sentiment</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">7.4</div><div className="flex items-center text-green-600 text-xs"><ArrowUp size={14} className="mr-0.5" /><span>0.8 vs last report</span></div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Top Communicative Style</CardTitle><MessageSquare className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">Constructive</div><p className="text-xs text-muted-foreground">Your dominant style</p></CardContent></Card>
        
        <Card className="bg-primary text-primary-foreground">
          <CardHeader>
            <CardTitle>Upload Chat Record</CardTitle>
            <CardDescription className="text-primary-foreground/80">Get a new in-depth analysis report.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="text-sm font-medium">Recent Uploads</div>
              <div className="space-y-1 pr-2">
                {isLoadingFiles ? (
                  <div className="text-center text-sm text-primary-foreground/80">Loading...</div>
                ) : uploadedFiles.length > 0 ? (
                  uploadedFiles.slice(0, 3).map((file) => (
                    <div key={file.id} className="flex items-center justify-between gap-2 text-xs text-primary-foreground/90">
                      <div className="flex items-center gap-2 truncate">
                        {renderStatusIcon(file.status)}
                        <span className="truncate" title={file.file_name}>{file.file_name}</span>
                      </div>
                      <button onClick={() => handleDelete(file.id)} className="hover:text-red-400 shrink-0"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-sm text-primary-foreground/80">No files yet.</div>
                )}
              </div>
            </div>
            <input type="file" ref={fileInputRef} onChange={onFileSelect} multiple className="hidden" />
            <Button variant="secondary" className="w-full" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Upload and Start
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
         <Card className="lg:col-span-4"><CardHeader><CardTitle>Sentiment Trend Analysis</CardTitle><CardDescription>Communication vs. Intimacy over the last 6 months.</CardDescription></CardHeader><CardContent className="pl-2 h-[300px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={sentimentData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" strokeWidth={0} /><YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} strokeWidth={0} /><Tooltip contentStyle={{ borderRadius: "var(--radius)", border: "1px solid hsl(var(--border))", background: "hsl(var(--background))", }}/><Line type="monotone" dataKey="communication" stroke="hsl(var(--primary))" strokeWidth={2} name="Communication" /><Line type="monotone" dataKey="intimacy" stroke="hsl(var(--secondary))" strokeWidth={2} name="Intimacy" /></LineChart></ResponsiveContainer></CardContent></Card>
        <Card className="lg:col-span-3"><CardHeader><CardTitle>Communication Style Distribution</CardTitle><CardDescription>Your primary communication archetypes.</CardDescription></CardHeader><CardContent className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><RadarChart outerRadius="70%" data={communicationStyleData}><PolarGrid /><PolarAngleAxis dataKey="subject" /><PolarRadiusAxis angle={90} domain={[0, 40]} /><Radar name="Style" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.4} /><Tooltip contentStyle={{ borderRadius: "var(--radius)", border: "1px solid hsl(var(--border))", background: "hsl(var(--background))", }}/></RadarChart></ResponsiveContainer></CardContent></Card>
      </div>
    </div>
  );
}
