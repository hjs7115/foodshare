import { showToast } from '../../utils/feedback';
﻿import { useState, useRef } from 'react';
import { X, Camera } from 'lucide-react';
import { API_ENDPOINTS, apiRequest, resolveImageUrl, uploadImage } from '../../api/config';
import { getStoredUserInfo } from '../../auth/session';

interface CreatePostScreenProps {
  onClose: () => void;
  currentBoard: string;
  onCreatePost: (item: any) => void;
}

export default function CreatePostScreen({ onClose, currentBoard, onCreatePost }: CreatePostScreenProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [expiry, setExpiry] = useState('');
  const [targetCount, setTargetCount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imageError, setImageError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    const imageUrls: string[] = [];
    setImageFiles((currentFiles) => [...currentFiles, ...fileArray]);

    fileArray.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        imageUrls.push(reader.result as string);
        if (imageUrls.length === fileArray.length) {
          setImages([...images, ...imageUrls]);
          setImageError('');
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setImageFiles(imageFiles.filter((_, i) => i !== index));
  };

  const getAuthorLocation = () => {
    const tradeLocation = localStorage.getItem('userLocation') || '';
    const savedCoords = localStorage.getItem('userLocationCoords');

    if (!savedCoords) {
      return { tradeLocation };
    }

    try {
      const coords = JSON.parse(savedCoords);
      return {
        tradeLocation,
        latitude: coords.lat,
        longitude: coords.lng,
      };
    } catch {
      return { tradeLocation };
    }
  };

  const getCurrentUser = () => getStoredUserInfo() || {};

  const getUserId = (user: any): number | undefined => {
    const id = user?.id ?? user?.userId ?? user?.memberId;
    return id == null ? undefined : Number(id);
  };

  const getUserNickname = (user: any): string => (
    user?.nickname ||
    user?.name ||
    user?.username ||
    user?.email ||
    ''
  );

  const getAuthorFromPost = (post: any, fallbackUser: any) => (
    post.authorNickname ||
    post.writerNickname ||
    post.memberNickname ||
    post.nickname ||
    post.user?.nickname ||
    post.author?.nickname ||
    post.writer?.nickname ||
    post.member?.nickname ||
    post.createdBy ||
    post.author ||
    getUserNickname(fallbackUser) ||
    '작성자'
  );

  const getRatingValue = (source: any): number => {
    const rating =
      source?.freshness ??
      source?.rating ??
      source?.freshnessScore ??
      source?.ratingScore ??
      source?.trustScore ??
      source?.mannerScore ??
      source?.freshnessRating ??
      source?.mannerTemperature ??
      0;

    return Number(rating) || 0;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!title || !amount) {
      showToast('제목과 수량은 필수 입력 항목입니다.');
      return;
    }
    if (images.length === 0) {
      const message = '게시글 사진을 최소 1장 첨부해주세요.';
      setImageError(message);
      showToast(message);
      return;
    }

    const postType = currentBoard === '나눔 및 판매'
      ? (category === '나눔' ? 'SHARE' : 'SALE')
      : 'GROUP_BUY';
    const authorLocation = getAuthorLocation();
    const currentUser = getCurrentUser();

    setIsSubmitting(true);

    try {
      const uploadedImageUrl = await uploadImage(imageFiles[0]);

      const postData = {
        title,
        content,
        amount,
        price: category === '나눔' ? '무료나눔' : price || '가격미정',
        postType,
        board: currentBoard,
        category: currentBoard === '나눔 및 판매' ? category : '공동구매',
        image: uploadedImageUrl,
        imageUrl: uploadedImageUrl,
        ...authorLocation,
        ...(currentBoard === '나눔 및 판매' && { expiry, deadline }),
        ...(currentBoard === '공동구매' && {
          targetCount: parseInt(targetCount) || 5,
          currentCount: 1,
          deadline,
        }),
      };

      const response = await apiRequest(API_ENDPOINTS.createPost, {
        method: 'POST',
        body: JSON.stringify(postData),
      });

      const serverPost = response.post || response.data?.post || response.data || response;
      const newPost = {
        id: serverPost.id || Date.now(),
        title: serverPost.title || title,
        content: serverPost.content || content,
        amount: serverPost.amount || amount,
        price: serverPost.price || postData.price,
        postType: serverPost.postType || postType,
        distanceValue: serverPost.distanceValue || 0.5,
        distance: serverPost.distance || '0.5km',
        emoji: currentBoard === '나눔 및 판매' ? '🥬' : '🛒',
        image: resolveImageUrl(serverPost.image || serverPost.imageUrl || uploadedImageUrl),
        author: getAuthorFromPost(serverPost, currentUser),
        authorId: getUserId(serverPost.user || serverPost.author || serverPost.writer || serverPost.member) ??
          getUserId({ id: serverPost.userId ?? serverPost.authorId ?? serverPost.writerId ?? serverPost.memberId }) ??
          getUserId(currentUser),
        nickname: serverPost.nickname || serverPost.user?.nickname || serverPost.author?.nickname || getUserNickname(currentUser),
        rating: getRatingValue(serverPost) || getRatingValue(currentUser) || 0,
        tradeLocation: serverPost.tradeLocation || authorLocation.tradeLocation,
        latitude: serverPost.latitude || authorLocation.latitude,
        longitude: serverPost.longitude || authorLocation.longitude,
        createdAt: serverPost.createdAt || new Date().toISOString(),
        ...(currentBoard === '나눔 및 판매' && {
          expiry: serverPost.expiry || expiry,
          deadline: serverPost.deadline || deadline,
        }),
        ...(currentBoard === '공동구매' && {
          targetCount: serverPost.targetCount || parseInt(targetCount) || 5,
          currentCount: serverPost.currentCount || 1,
          deadline: serverPost.deadline || deadline,
        }),
      };

      const localPost = currentBoard === '나눔 및 판매'
        ? {
            id: newPost.id,
            emoji: '🥬',
            name: newPost.title,
            amount: newPost.amount,
            price: newPost.price,
            distance: '0.5km',
            distanceValue: 0.5,
            expiry: newPost.expiry || '유통기한 정보 없음',
            deadline: newPost.deadline || '',
            image: newPost.image,
            author: newPost.author,
            authorId: newPost.authorId,
            nickname: newPost.nickname,
            rating: newPost.rating,
            tradeLocation: newPost.tradeLocation,
            latitude: newPost.latitude,
            longitude: newPost.longitude,
            createdAt: newPost.createdAt,
          }
        : {
            id: newPost.id,
            emoji: '🛒',
            name: newPost.title,
            currentCount: newPost.currentCount || 1,
            targetCount: newPost.targetCount || parseInt(targetCount) || 5,
            price: `${newPost.amount} / ${newPost.price || '가격미정'}`,
            distance: '0.5km',
            distanceValue: 0.5,
            deadline: newPost.deadline || '마감일 미정',
            image: newPost.image,
            author: newPost.author,
            authorId: newPost.authorId,
            nickname: newPost.nickname,
            rating: newPost.rating,
            tradeLocation: newPost.tradeLocation,
            latitude: newPost.latitude,
            longitude: newPost.longitude,
            createdAt: newPost.createdAt,
          };

      onCreatePost(localPost);
      showToast('게시글이 작성되었습니다.');
      onClose();
    } catch (error: any) {
      showToast(error.message || '게시글 작성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col animate-slide-up">
      {/* Header */}
      <div className="bg-white border-b border-[#e2e8f0] px-5 py-4 flex items-center justify-between">
        <button onClick={onClose} className="text-[#2d3748]">
          <X size={24} />
        </button>
        <h1 className="text-lg text-[#2d3748]" style={{ fontWeight: 600 }}>
          {currentBoard === '나눔 및 판매' ? '나눔/판매 작성' : '공동구매 작성'}
        </h1>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="text-[#bef264] text-base disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ fontWeight: 600 }}
        >
          {isSubmitting ? '작성 중' : '완료'}
        </button>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        <div className="space-y-5">
          {/* Image Upload */}
          <div className="flex gap-3 overflow-x-auto pb-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-2xl border-2 border-dashed border-[#e2e8f0] flex flex-col items-center justify-center bg-[#f7fafc] shrink-0 hover:border-[#bef264] transition-colors"
            >
              <Camera size={24} className="text-[#cbd5e0] mb-1" />
              <span className="text-xs text-[#718096]">
                {images.length}/10
              </span>
            </button>

            {/* Image Preview */}
            {images.map((image, index) => (
              <div key={index} className="relative w-24 h-24 rounded-2xl shrink-0">
                <img
                  src={image}
                  alt={`preview ${index + 1}`}
                  className="w-full h-full object-cover rounded-2xl"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-[#2d3748] text-white rounded-full flex items-center justify-center hover:bg-[#1a202c] transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          {imageError && (
            <p className="text-sm text-[#e53e3e] -mt-3">
              {imageError}
            </p>
          )}

          {/* Category Selection */}
          {currentBoard === '나눔 및 판매' && (
            <div>
              <label className="block text-sm text-[#2d3748] mb-2" style={{ fontWeight: 500 }}>
                카테고리
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setCategory('나눔')}
                  className={`flex-1 py-3 rounded-xl border-2 transition-colors ${
                    category === '나눔'
                      ? 'bg-[#f0fff4] border-[#bef264] text-[#0a0a0a]'
                      : 'bg-white border-[#e2e8f0] text-[#2d3748]'
                  }`}
                  style={{ fontWeight: 500 }}
                >
                  나눔
                </button>
                <button
                  onClick={() => setCategory('판매')}
                  className={`flex-1 py-3 rounded-xl border-2 transition-colors ${
                    category === '판매'
                      ? 'bg-[#f0fff4] border-[#bef264] text-[#0a0a0a]'
                      : 'bg-white border-[#e2e8f0] text-[#2d3748]'
                  }`}
                  style={{ fontWeight: 500 }}
                >
                  판매
                </button>
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm text-[#2d3748] mb-2" style={{ fontWeight: 500 }}>
              제목
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              className="w-full px-4 py-3.5 rounded-2xl border border-[#e2e8f0] focus:border-[#bef264] focus:outline-none bg-[#f7fafc]"
            />
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="amount" className="block text-sm text-[#2d3748] mb-2" style={{ fontWeight: 500 }}>
              수량
            </label>
            <input
              id="amount"
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="예: 300g, 1개"
              className="w-full px-4 py-3.5 rounded-2xl border border-[#e2e8f0] focus:border-[#bef264] focus:outline-none bg-[#f7fafc]"
            />
          </div>

          {/* Price */}
          <div>
            <label htmlFor="price" className="block text-sm text-[#2d3748] mb-2" style={{ fontWeight: 500 }}>
              가격
            </label>
            <input
              id="price"
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={category === '나눔' ? '무료나눔' : '가격을 입력하세요'}
              className="w-full px-4 py-3.5 rounded-2xl border border-[#e2e8f0] focus:border-[#bef264] focus:outline-none bg-[#f7fafc]"
              disabled={category === '나눔'}
            />
          </div>

          {/* Expiry */}
          {currentBoard === '나눔 및 판매' && (
            <>
              <div>
                <label htmlFor="expiry" className="block text-sm text-[#2d3748] mb-2" style={{ fontWeight: 500 }}>
                  유통기한
                </label>
                <input
                  id="expiry"
                  type="date"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl border border-[#e2e8f0] focus:border-[#bef264] focus:outline-none bg-[#f7fafc]"
                />
              </div>
              <div>
                <label htmlFor="shareSaleDeadline" className="block text-sm text-[#2d3748] mb-2" style={{ fontWeight: 500 }}>
                  거래 마감일
                </label>
                <input
                  id="shareSaleDeadline"
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl border border-[#e2e8f0] focus:border-[#bef264] focus:outline-none bg-[#f7fafc]"
                />
              </div>
            </>
          )}

          {/* Target Count */}
          {currentBoard === '공동구매' && (
            <>
              <div>
                <label htmlFor="targetCount" className="block text-sm text-[#2d3748] mb-2" style={{ fontWeight: 500 }}>
                  목표 인원
                </label>
                <input
                  id="targetCount"
                  type="number"
                  value={targetCount}
                  onChange={(e) => setTargetCount(e.target.value)}
                  placeholder="목표 인원을 입력하세요"
                  className="w-full px-4 py-3.5 rounded-2xl border border-[#e2e8f0] focus:border-[#bef264] focus:outline-none bg-[#f7fafc]"
                />
              </div>
              <div>
                <label htmlFor="deadline" className="block text-sm text-[#2d3748] mb-2" style={{ fontWeight: 500 }}>
                  마감일
                </label>
                <input
                  id="deadline"
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl border border-[#e2e8f0] focus:border-[#bef264] focus:outline-none bg-[#f7fafc]"
                />
              </div>
            </>
          )}

          {/* Content */}
          <div>
            <label htmlFor="content" className="block text-sm text-[#2d3748] mb-2" style={{ fontWeight: 500 }}>
              내용
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="상세 내용을 입력하세요"
              rows={8}
              className="w-full px-4 py-3.5 rounded-2xl border border-[#e2e8f0] focus:border-[#bef264] focus:outline-none bg-[#f7fafc] resize-none"
            />
          </div>

        </div>
      </div>
    </div>
  );
}
