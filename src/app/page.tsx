import CiteRightForm from '@/components/cite-right-form';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-2xl">
        <CiteRightForm />
      </div>
    </main>
  );
}
