import { useNavigate } from 'react-router-dom';
import { MasonicTemple } from '@/components/temple3d/MasonicTemple';
import { useSettings } from '@/hooks/useSettings';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function Temple3D() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  useThemeColor(settings?.cor_tema);

  return (
    <div className="h-screen w-screen bg-background">
      <MasonicTemple onClose={() => navigate('/')} />
    </div>
  );
}
