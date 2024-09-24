import UserInfo from './UserInfo';

export default function Header() {
  return (
    <header className="flex items-center justify-between p-4 shadow-md">
      <h1 className="text-xl font-bold">Telloom</h1>
      <UserInfo />
    </header>
  );
}