// components/LogoutButton.tsx
export default function LogoutButton() {
    return (
      <form action="/api/auth/logout" method="POST">
        <button type="submit">Logout</button>
      </form>
    );
  }