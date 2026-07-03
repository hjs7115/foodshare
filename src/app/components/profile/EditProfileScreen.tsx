import { useState, useEffect, useRef } from 'react';
import { X, Camera, User } from 'lucide-react';
import { API_ENDPOINTS, apiRequest, resolveImageUrl, uploadImage } from '../../api/config';
import BackendImage from '../common/BackendImage';
import { getStoredUserInfo, saveStoredUserInfo } from '../../auth/session';

interface UserInfo {
  name: string;
  nickname: string;
  email: string;
  phone?: string;
  profileImage?: string;
}

interface EditProfileScreenProps {
  onClose: () => void;
  onSave: () => void;
}

export default function EditProfileScreen({ onClose, onSave }: EditProfileScreenProps) {
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: '',
    nickname: '',
    email: '',
    phone: '',
  });
  const [profileImage, setProfileImage] = useState('');
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedUserInfo = getStoredUserInfo<UserInfo>();
    if (savedUserInfo) {
      setUserInfo(savedUserInfo);
      setProfileImage(savedUserInfo.profileImage ? resolveImageUrl(savedUserInfo.profileImage) : '');
    }
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const uploadedProfileImage = selectedImageFile
        ? await uploadImage(selectedImageFile)
        : profileImage;

      const response = await apiRequest(API_ENDPOINTS.updateProfile, {
        method: 'PUT',
        body: JSON.stringify({
          nickname: userInfo.nickname,
          profileImage: uploadedProfileImage || undefined,
        }),
      });

      const serverUser = response.user || response.data?.user || response.data;
      const updatedUserInfo = {
        ...userInfo,
        ...(serverUser || {}),
        profileImage: serverUser?.profileImage || uploadedProfileImage,
      };

      saveStoredUserInfo(updatedUserInfo);
      setProfileImage(resolveImageUrl(updatedUserInfo.profileImage || ''));
      setSelectedImageFile(null);

      alert('프로필이 수정되었습니다.');
      onSave();
    } catch (error: any) {
      alert(error.message || '프로필 수정에 실패했습니다.');
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col animate-slide-up">
      <div className="bg-white border-b border-[#e2e8f0] px-5 py-4 flex items-center justify-between">
        <button onClick={onClose} className="text-[#2d3748]">
          <X size={24} />
        </button>
        <h1 className="text-lg text-[#2d3748]" style={{ fontWeight: 600 }}>
          프로필 수정
        </h1>
        <button
          onClick={handleSubmit}
          className="text-[#bef264] text-base"
          style={{ fontWeight: 600 }}
        >
          완료
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center py-6">
            <div className="relative">
              <div className="w-28 h-28 rounded-full bg-[#e2e8f0] flex items-center justify-center overflow-hidden">
                {profileImage ? (
                  <BackendImage src={profileImage} alt="프로필 사진" className="w-full h-full object-cover" />
                ) : (
                  <User size={56} className="text-[#718096]" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-10 h-10 bg-[#bef264] rounded-full flex items-center justify-center shadow-md hover:bg-[#a3e635] transition-colors"
              >
                <Camera size={20} className="text-[#0a0a0a]" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
            <p className="text-sm text-[#718096] mt-4">프로필 사진을 변경하려면 카메라 아이콘을 누르세요.</p>
          </div>

          <div>
            <label htmlFor="nickname" className="block text-sm text-[#2d3748] mb-2" style={{ fontWeight: 500 }}>
              닉네임
            </label>
            <input
              id="nickname"
              type="text"
              value={userInfo.nickname}
              onChange={(e) => setUserInfo({ ...userInfo, nickname: e.target.value })}
              placeholder="닉네임을 입력하세요"
              className="w-full px-4 py-3.5 rounded-2xl border border-[#e2e8f0] focus:border-[#bef264] focus:outline-none bg-[#f7fafc]"
              required
            />
          </div>

          <div className="pt-4 space-y-3 border-t border-[#e2e8f0]">
            <p className="text-sm text-[#718096] mb-3">계정 정보</p>

            <div>
              <label className="block text-xs text-[#a0aec0] mb-1">이메일</label>
              <div className="w-full px-4 py-3 rounded-2xl bg-[#f7fafc] border border-[#e2e8f0] text-[#718096] text-sm">
                {userInfo.email}
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#a0aec0] mb-1">이름</label>
              <div className="w-full px-4 py-3 rounded-2xl bg-[#f7fafc] border border-[#e2e8f0] text-[#718096] text-sm">
                {userInfo.name}
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#a0aec0] mb-1">전화번호</label>
              <div className="w-full px-4 py-3 rounded-2xl bg-[#f7fafc] border border-[#e2e8f0] text-[#718096] text-sm">
                {userInfo.phone || '등록된 전화번호가 없습니다'}
              </div>
            </div>

            <p className="text-xs text-[#a0aec0] pt-2">
              * 이메일, 이름, 전화번호는 고객센터를 통해 변경할 수 있습니다.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
