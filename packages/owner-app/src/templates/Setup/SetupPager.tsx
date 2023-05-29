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
                ? 'rounded-t border-indigo-500 bg-gray-100 text-indigo-500 dark:bg-gray-700'
                : currentPage.isValid
                ? 'border-gray-200 text-gray-900 dark:border-gray-600 dark:text-gray-600'
                : 'border-gray-200 text-gray-400 hover:text-gray-900 dark:border-gray-600 dark:hover:text-gray-600'
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
