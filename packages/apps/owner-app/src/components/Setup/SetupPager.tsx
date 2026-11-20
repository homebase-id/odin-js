const Pager = ({
  page,
  setPage,
  pages,
}: {
  page: number;
  setPage: (i: number) => void;
  pages: { title: string; isValid: boolean }[];
}) => {
  return (
    <>
      <div className="mb-10 flex w-full flex-wrap">
        {pages.map((currentPage, index) => (
          <a
            className={`inline-flex grow items-center justify-center border-b-2 ${
              page === index
                ? 'rounded-t border-primary bg-surface-container-high text-primary'
                : currentPage.isValid
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            } cursor-pointer py-3 font-medium leading-none  tracking-wider sm:w-auto sm:justify-start sm:px-6`}
            key={index}
            onClick={() => setPage(index)}
          >
            {index + 1}. {currentPage.title}
          </a>
        ))}
      </div>
      <h1 className="mb-5 text-2xl">{pages[page]?.title}</h1>
    </>
  );
};

export default Pager;
