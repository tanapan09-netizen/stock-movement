'use client';

import { useState } from 'react';
import { MessageCircle, Send, User, Clock, Trash2 } from 'lucide-react';

interface Comment {
    id: number;
    user: string;
    text: string;
    timestamp: Date;
}

interface CommentSectionProps {
    entityType: 'po' | 'borrow' | 'asset';
    entityId: number;
    initialComments?: Comment[];
}

export default function CommentSection({ entityType, entityId, initialComments = [] }: CommentSectionProps) {
    const [comments, setComments] = useState<Comment[]>(initialComments);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setIsSubmitting(true);

        // Add comment locally (in real app, save to database)
        const comment: Comment = {
            id: Date.now(),
            user: 'Admin', // Get from session
            text: newComment.trim(),
            timestamp: new Date()
        };

        setComments(prev => [comment, ...prev]);
        setNewComment('');
        setIsSubmitting(false);

        // TODO: Save to database via API
        // await fetch(`/api/comments/${entityType}/${entityId}`, {
        //     method: 'POST',
        //     body: JSON.stringify({ text: newComment })
        // });
    };

    const handleDelete = (id: number) => {
        setComments(prev => prev.filter(c => c.id !== id));
        // TODO: Delete from database
    };

    const formatTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - new Date(date).getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'เมื่อสักครู่';
        if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
        if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
        return `${days} วันที่แล้ว`;
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                <MessageCircle className="w-5 h-5 text-blue-500" />
                ความคิดเห็น
                {comments.length > 0 && (
                    <span className="text-sm font-normal text-gray-500">({comments.length})</span>
                )}
            </h3>

            {/* New Comment Form */}
            <form onSubmit={handleSubmit} className="mb-6">
                <div className="flex gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div className="flex-1">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="เขียนความคิดเห็น..."
                            rows={2}
                            className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600"
                        />
                        <div className="flex justify-end mt-2">
                            <button
                                type="submit"
                                disabled={!newComment.trim() || isSubmitting}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                                <Send className="w-4 h-4" />
                                ส่ง
                            </button>
                        </div>
                    </div>
                </div>
            </form>

            {/* Comments List */}
            <div className="space-y-4">
                {comments.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>ยังไม่มีความคิดเห็น</p>
                    </div>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3 group">
                            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
                                    {comment.user[0].toUpperCase()}
                                </span>
                            </div>
                            <div className="flex-1 bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-gray-800 dark:text-white">
                                        {comment.user}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatTime(comment.timestamp)}
                                        </span>
                                        <button
                                            onClick={() => handleDelete(comment.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition"
                                            title="ลบความคิดเห็น"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap">
                                    {comment.text}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
