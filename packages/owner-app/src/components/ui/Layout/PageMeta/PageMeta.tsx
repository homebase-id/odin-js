import { FC, ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import SaveStatus from '../../Buttons/SaveStatus';

const PageMeta = ({
  title,
  actions,
  saveStatus,
  breadCrumbs,
  icon,
}: {
  title?: ReactNode | string;
  actions?: ReactNode;
  saveStatus?: 'error' | 'idle' | 'loading' | 'success';
  breadCrumbs?: { title: string; href?: string }[];
  icon?: FC;
}) => {
  return (
    <section
      className="-mx-2 -mt-4 mb-10 border-b border-gray-100 bg-white py-1 px-2 dark:border-gray-800 dark:bg-black sm:-mx-10
    sm:-mt-8 sm:px-10 lg:py-8"
    >
      <div className="-m-1 flex min-h-[3rem] flex-row flex-wrap items-center sm:flex-nowrap">
        <div className="flex-col p-1">
          {breadCrumbs && (
            <ul className="mb-2 hidden flex-row lg:flex">
              {breadCrumbs.map((crumb, index) => {
                return (
                  <li key={index} className="mr-2">
                    {crumb.href ? (
                      <Link to={crumb.href} className="">
                        {crumb.title}
                        <span className="ml-2">{'>'}</span>
                      </Link>
                    ) : (
                      <span className="text-slate-500">{crumb.title}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {title && (
            <>
              <h1 className="flex flex-row pl-12 text-2xl dark:text-white sm:pl-4 lg:pl-0 lg:text-4xl">
                {icon && icon({ className: 'h-8 w-8 my-auto mr-4 flex-shrink-0 hidden sm:block' })}{' '}
                {title}
              </h1>
              <Helmet>
                <title>
                  {(typeof title !== 'object' && `${title}`) ||
                    window.location.pathname.split('/').pop()}{' '}
                  | Odin
                </title>
              </Helmet>
            </>
          )}
        </div>
        {actions ? (
          <div className="ml-auto p-1">
            <div className="grid grid-flow-col gap-2">{actions}</div>
            {saveStatus && <SaveStatus className="mt-1" state={saveStatus} />}
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default PageMeta;
