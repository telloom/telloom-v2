import Image from 'next/image';
import Link from 'next/link';

export default function Logo() {
  return (
    <div className="flex justify-center">
      <Link href="/">
        <Image
          src="/images/Telloom Logo V1-Horizontal Green.png"
          alt="Telloom Logo"
          width={160}
          height={40}
          priority={true}
          quality={100}
          className="mx-auto"
          style={{
            width: 'auto',
            height: 'auto',
            maxWidth: '160px'
          }}
        />
      </Link>
    </div>
  );
} 