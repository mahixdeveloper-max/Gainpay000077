import { useState } from "react";
import { MessageSquare, X, Send } from "lucide-react";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { addDoc, collection } from "firebase/firestore";

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    
    setSubmitting(true);
    try {
      await addDoc(collection(db, "feedback"), {
        userId: auth.currentUser?.uid || "anonymous",
        feedback: feedback,
        timestamp: Date.now(),
      });
      setFeedback("");
      setIsOpen(false);
      alert("Feedback submitted successfully!");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "feedback");
      alert("Failed to submit feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all z-50"
      >
        <MessageSquare size={24} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-3xl w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Send Feedback</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Tell us what you think..."
                className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-sm font-black focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all h-32"
                required
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white py-3 rounded-xl text-xs font-black shadow-lg shadow-blue-100 active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 uppercase tracking-widest"
              >
                <Send size={16} />
                <span>{submitting ? "Submitting..." : "Submit Feedback"}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
