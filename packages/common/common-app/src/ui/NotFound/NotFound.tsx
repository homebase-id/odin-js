import { ActionButton } from '../Buttons/ActionButton';

export const NotFound = () => {
  return (
    <section className="flex h-full grow flex-col bg-red-50 py-5 text-black">
      <h1 className="my-auto text-center text-3xl font-medium">
        404&apos;d! Nothing to see here.
        <small className="block font-light">Take your control</small>
        <div className="flex flex-row justify-center font-normal text-base">
          <ActionButton type="secondary" onClick={() => window.history.back()}>
            Back
          </ActionButton>
        </div>
      </h1>
    </section>
  );
};
