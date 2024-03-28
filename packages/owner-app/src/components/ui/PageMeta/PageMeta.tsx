import { SaveStatus } from '@youfoundation/common-app';
import { FC, ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

export const PageMeta = ({
  title,
  browserTitle,
  actions,
  saveStatus,
  breadCrumbs,
  icon,
}: {
  title?: ReactNode | string;
  browserTitle?: string;
  actions?: ReactNode;
  saveStatus?: 'error' | 'idle' | 'loading' | 'success';
  breadCrumbs?: { title: string; href?: string }[];
  icon?: FC;
}) => {
  return (
    <section className="-mx-2 -mt-4 mb-10 border-b border-gray-100 bg-white px-2 py-1 dark:border-gray-800 dark:bg-black sm:-mx-10 sm:-mt-8 sm:px-10 xl:py-8">
      <div className="flex-col">
        {breadCrumbs && (
          <ul className="mb-2 hidden flex-row xl:flex">
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
        <div className="flex flex-row items-end gap-5">
          {title && (
            <>
              <h1 className="my-auto flex flex-row text-2xl dark:text-white xl:text-4xl">
                {icon &&
                  icon({
                    className: 'h-6 w-6 sm:h-8 sm:w-8 my-auto mr-2 sm:mr-4 flex-shrink-0',
                  })}{' '}
                {title}
              </h1>
              <Helmet>
                <title>
                  {browserTitle ||
                    (typeof title !== 'object' && `${title}`) ||
                    window.location.pathname.split('/').pop()}{' '}
                  | Homebase
                </title>
              </Helmet>
            </>
          )}
          {actions ? (
            <div>
              <div className="grid grid-flow-col items-center gap-2">{actions}</div>
              {saveStatus && <SaveStatus className="mt-1" state={saveStatus} />}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};
