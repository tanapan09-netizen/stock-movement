'use client';

import { useState } from 'react';
import { Star, Package, X, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface Favorite {
    id: string;
    name: string;
    type: 'product' | 'page';
    href: string;
    addedAt: Date;
}

export function useFavorites() {
    const [favorites, setFavorites] = useState<Favorite[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('favorites');
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch (e) {
                    console.error("Failed to parse favorites", e);
                }
            }
        }
        return [];
    });

    const addFavorite = (item: Omit<Favorite, 'addedAt'>) => {
        const newFav = { ...item, addedAt: new Date() };
        const updated = [...favorites.filter(f => f.id !== item.id), newFav];
        setFavorites(updated);
        localStorage.setItem('favorites', JSON.stringify(updated));
    };

    const removeFavorite = (id: string) => {
        const updated = favorites.filter(f => f.id !== id);
        setFavorites(updated);
        localStorage.setItem('favorites', JSON.stringify(updated));
    };

    const isFavorite = (id: string) => favorites.some(f => f.id === id);

    return { favorites, addFavorite, removeFavorite, isFavorite };
}

// Star button for adding/removing favorites
export function FavoriteButton({
    item,
    size = 'md'
}: {
    item: Omit<Favorite, 'addedAt'>;
    size?: 'sm' | 'md'
}) {
    const { isFavorite, addFavorite, removeFavorite } = useFavorites();
    const starred = isFavorite(item.id);

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (starred) {
            removeFavorite(item.id);
        } else {
            addFavorite(item);
        }
    };

    const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

    return (
        <button
            onClick={handleClick}
            className={`p-1 rounded-full transition ${starred
                    ? 'text-yellow-500 hover:text-yellow-600'
                    : 'text-gray-400 hover:text-yellow-500'
                }`}
            title={starred ? 'ลบออกจากรายการโปรด' : 'เพิ่มเป็นรายการโปรด'}
        >
            <Star className={`${sizeClass} ${starred ? 'fill-current' : ''}`} />
        </button>
    );
}

// Favorites sidebar widget
export function FavoritesWidget() {
    const { favorites, removeFavorite } = useFavorites();
    const [isExpanded, setIsExpanded] = useState(true);

    if (favorites.length === 0) return null;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border mb-4">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-lg"
            >
                <span className="flex items-center gap-2 font-medium">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    รายการโปรด
                    <span className="text-xs text-gray-400">({favorites.length})</span>
                </span>
                <ChevronRight className={`w-4 h-4 transition ${isExpanded ? 'rotate-90' : ''}`} />
            </button>

            {isExpanded && (
                <div className="border-t dark:border-gray-700">
                    {favorites.slice(0, 5).map((fav) => (
                        <div key={fav.id} className="flex items-center group">
                            <Link
                                href={fav.href}
                                className="flex-1 flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                            >
                                <Package className="w-4 h-4 text-gray-400" />
                                <span className="truncate">{fav.name}</span>
                            </Link>
                            <button
                                onClick={() => removeFavorite(fav.id)}
                                className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                                title="ลบ"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {favorites.length > 5 && (
                        <Link href="/favorites" className="block px-3 py-2 text-xs text-blue-500 hover:underline">
                            ดูทั้งหมด ({favorites.length})
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}

// Full favorites page content
export function FavoritesPage() {
    const { favorites, removeFavorite } = useFavorites();

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold flex items-center gap-2">
                <Star className="w-7 h-7 text-yellow-500 fill-current" />
                รายการโปรด
            </h1>

            {favorites.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
                    <Star className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">ยังไม่มีรายการโปรด</h3>
                    <p className="text-gray-400">คลิกที่ ⭐ บนสินค้าเพื่อเพิ่มเป็นรายการโปรด</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">ชื่อ</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">ประเภท</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {favorites.map((fav) => (
                                <tr key={fav.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-4 py-3">
                                        <Link href={fav.href} className="flex items-center gap-2 hover:text-blue-600">
                                            <Package className="w-4 h-4 text-gray-400" />
                                            <span className="font-medium">{fav.name}</span>
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500 capitalize">{fav.type}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => removeFavorite(fav.id)}
                                            className="text-red-500 hover:text-red-700 p-1"
                                            title="ลบ"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
