import Image from 'next/image';
import Link from 'next/link';

export default function Logo() {
  return (
    <div className="flex justify-center">
      <Link href="/">
        <Image
          src="/images/Telloom Logo V1-Horizontal Green.png"
          alt="Telloom Logo"
          width={180}
          height={52}
          priority={true}
          quality={100}
          className="mx-auto"
          style={{
            width: '160px',
            height: 'auto',
            maxWidth: '100%'
          }}
        />
      </Link>
    </div>
  );
} 