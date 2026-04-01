import React, { useState, useEffect } from 'react';
import { DocumentScanner } from '../../components/Trips/DocumentScanner';
import { Shield, Lock, FileText, History, Info, Trash2, ExternalLink, Loader2, ChevronRight, Clock, MapPin, Calendar, X, Plane, Hotel, CreditCard, User, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getUserDocuments } from '../../services/geminiScannerService';
import { useAuth } from '../../components/Auth/AuthContext';
import { format } from 'date-fns';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'sonner';

export const DocumentVault: React.FC = () => {
  const { user } = useAuth();
  const [savedDocs, setSavedDocs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);

  useEffect(() => {
    if (user) {
      fetchDocs();
    }
  }, [user]);

  const fetchDocs = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const docs = await getUserDocuments(user.uid);
      setSavedDocs(docs);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!user) return;
    
    // Using a simple confirm for now, but in a real app we'd use a custom modal
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await deleteDoc(doc(db, `users/${user.uid}/documents`, docId));
      setSavedDocs(prev => prev.filter(d => d.id !== docId));
      toast.success('Document deleted from your vault');
      if (selectedDoc?.id === docId) setSelectedDoc(null);
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete document');
    }
  };

  const getDocIcon = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('flight') || t.includes('ticket')) return <Plane className="w-5 h-5" />;
    if (t.includes('hotel') || t.includes('booking')) return <Hotel className="w-5 h-5" />;
    if (t.includes('id') || t.includes('passport')) return <User className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-bold mb-4"
          >
            <Shield className="w-4 h-4" />
            Secure Travel Vault
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight">
            Your Digital <span className="text-indigo-600">Travel Vault</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Scan and store your travel documents securely. Our AI automatically extracts your details for easy access.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Scanner */}
          <div className="lg:col-span-2">
            <DocumentScanner onSave={fetchDocs} />
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-indigo-600" />
                Privacy First
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Shield className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">End-to-End Secure</p>
                    <p className="text-xs text-gray-500">Your documents are encrypted and stored securely.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">AI Extraction</p>
                    <p className="text-xs text-gray-500">No manual entry needed. AI reads your tickets for you.</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-indigo-600 p-6 rounded-3xl text-white relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-lg font-bold mb-2">Coming Soon</h3>
                <p className="text-sm text-indigo-100 mb-4">
                  Automatic flight status tracking and hotel check-in reminders based on your scanned documents.
                </p>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest bg-white/20 px-3 py-1.5 rounded-full w-fit">
                  <History className="w-3 h-3" />
                  Smart Sync
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-600 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>Tip:</strong> For best results, ensure the document is flat and well-lit. Avoid glares on glossy IDs or tickets.
              </p>
            </div>
          </div>
        </div>

        {/* Recent Documents Section */}
        <div className="mt-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <History className="w-6 h-6 text-indigo-600" />
              Recent Documents
            </h2>
            <button 
              onClick={fetchDocs}
              className="text-sm font-bold text-indigo-600 hover:text-indigo-700"
            >
              Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
              <p className="text-gray-500 font-medium">Loading your vault...</p>
            </div>
          ) : savedDocs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {savedDocs.map((doc, index) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                          {getDocIcon(doc.type)}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">{doc.type}</h4>
                          <p className="text-xs text-gray-500">
                            {doc.created_at ? format(new Date(doc.created_at), 'MMM d, yyyy • h:mm a') : 'Date unknown'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleDelete(doc.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-gray-600 line-clamp-2 italic">
                        "{doc.summary || 'No summary available'}"
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {doc.details?.from_location && (
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                          <MapPin className="w-3 h-3" />
                          {doc.details.from_location}
                        </div>
                      )}
                      {doc.details?.departure_date && (
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                          <Calendar className="w-3 h-3" />
                          {doc.details.departure_date}
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => setSelectedDoc(doc)}
                      className="w-full py-2.5 bg-gray-50 text-gray-900 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
                    >
                      View Details
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">No documents yet</h3>
              <p className="text-gray-500 max-w-xs mx-auto text-sm">
                Scan your first travel document above to see it appear here in your secure vault.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDoc(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                      {getDocIcon(selectedDoc.type)}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900">{selectedDoc.type}</h3>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                        {selectedDoc.created_at ? format(new Date(selectedDoc.created_at), 'MMM d, yyyy') : 'Date unknown'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedDoc(null)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">AI Summary</h4>
                    <p className="text-gray-700 leading-relaxed italic">
                      "{selectedDoc.summary || 'No summary available'}"
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(selectedDoc.details || {}).map(([key, value]) => {
                      if (!value) return null;
                      return (
                        <div key={key} className={`p-4 bg-gray-50 rounded-2xl border border-gray-100 ${key === 'extra_info' ? 'col-span-2' : ''}`}>
                          <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                            {key.replace(/_/g, ' ')}
                          </h5>
                          <p className={`text-sm font-bold text-gray-900 ${key === 'extra_info' ? 'whitespace-pre-wrap break-words' : 'truncate'}`}>
                            {String(value)}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-4 flex flex-col gap-3">
                    {selectedDoc.image_url && (
                      <button 
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = selectedDoc.image_url;
                          link.download = `${selectedDoc.type.replace(/\s+/g, '_')}_${format(new Date(selectedDoc.created_at), 'yyyyMMdd')}.png`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="w-full py-3.5 bg-indigo-50 text-indigo-600 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Download Original File
                      </button>
                    )}
                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleDelete(selectedDoc.id)}
                        className="flex-1 py-3.5 bg-rose-50 text-rose-600 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-rose-100 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                      <button 
                        onClick={() => setSelectedDoc(null)}
                        className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
