import { useRef, useState } from 'react';
import useAuth from '../../hooks/useAuth';
import Avatar from './Avatar';

export default function ProfileSettings() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.user_name || '');
  const [photo, setPhoto] = useState(user?.profile_image || null);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const selection = useRef(0);
  const choose = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const version = ++selection.current;
    setError(''); setMessage('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) {
      setError('1MB 이하 JPG, PNG, WEBP 사진을 선택해 주세요.'); return;
    }
    setReading(true);
    try {
      const value = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('사진을 읽지 못했어요. 다시 선택해 주세요.'));
        reader.readAsDataURL(file);
      });
      const image = new Image();
      image.src = value;
      await image.decode();
      if (version === selection.current) setPhoto(value);
    } catch { if (version === selection.current) setError('사진을 읽지 못했어요. 다른 사진을 선택해 주세요.'); }
    finally { if (version === selection.current) setReading(false); }
  };
  const submit = async event => {
    event.preventDefault();
    if (busy || reading) return;
    if (!name.trim()) { setError('닉네임을 입력해 주세요.'); return; }
    setBusy(true); setError(''); setMessage('');
    try {
      const saved = await updateProfile({ user_name: name.trim(), profile_image: photo });
      setName(saved.user_name); setPhoto(saved.profile_image);
      setMessage('프로필을 저장했어요. 커뮤니티 글과 댓글에도 반영돼요.');
    } catch { setError('프로필을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.'); }
    finally { setBusy(false); }
  };
  return <section aria-labelledby="profile-title" className="flex flex-col gap-3">
    <h2 id="profile-title" className="text-sm font-bold text-gray-500">프로필 설정</h2>
    <form onSubmit={submit} className="rounded-xl border border-gray-200 p-4">
      <fieldset disabled={busy || reading} className="space-y-4 disabled:opacity-60">
        <div className="flex flex-wrap items-center gap-3">
          <Avatar name={name} src={photo} />
          <label className="text-sm font-bold text-brand-600">프로필 사진
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={choose} className="mt-2 block w-full max-w-64 text-xs text-gray-500" />
          </label>
          {photo && <button type="button" onClick={() => { setPhoto(null); setMessage(''); }} className="text-xs text-gray-500 underline">사진 삭제</button>}
        </div>
        <p className="text-xs text-gray-500">1MB 이하 JPG, PNG, WEBP</p>
        <label htmlFor="profile-nickname" className="block text-sm font-bold text-gray-700">닉네임</label>
        <input id="profile-nickname" value={name} onChange={event => { setName(event.target.value); setMessage(''); }} required maxLength={50} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" aria-describedby="nickname-help" />
        <p id="nickname-help" className="text-xs text-gray-500">1~50자</p>
        <button type="submit" className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white">{busy ? '저장 중…' : reading ? '사진 확인 중…' : '프로필 저장'}</button>
      </fieldset>
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      <p role="status" className="mt-3 text-sm text-brand-600">{message}</p>
    </form>
  </section>;
}
