import Image from 'next/image';

export default function RoleLayoutLoading() {
  return (
    <div className="min-h-[calc(100vh-65px)] flex items-center justify-center">
      <div className="w-full max-w-6xl px-4 py-6 md:py-8">
        <div className="w-full text-center">
          <div className="flex justify-center mb-8">
            <Image
              src="/images/Telloom Logo V1-Horizontal Green.png"
              alt="Telloom Logo"
              width={120}
              height={27}
              priority={true}
              style={{
                width: '120px',
                height: 'auto',
                maxWidth: '100%'
              }}
            />
          </div>
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1B4332] border-t-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
} 