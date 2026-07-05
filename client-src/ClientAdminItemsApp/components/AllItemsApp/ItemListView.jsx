import React, { useMemo, useState } from "react";
import clsx from "clsx";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ADMIN_URLS } from "../../../../common-src/StringUtils";
import { ITEM_STATUSES_STRINGS_DICT, ITEM_STATUSES_DICT, ITEMS_SORT_ORDERS } from "../../../../common-src/Constants";
import { msToDatetimeLocalString } from "../../../../common-src/TimeUtils";
import { listTypes } from "../../../../edge-src/registry/ContentTypeRegistry";
import AdminRadio from "../../../components/AdminRadio";
import TypeBadge from "./TypeBadge";
import ItemFilters from "./ItemFilters";

const columnHelper = createColumnHelper();

const columns = [
  columnHelper.accessor("contentType", {
    header: "Type",
    cell: (info) => <TypeBadge contentType={info.getValue()} />,
  }),
  columnHelper.accessor("title", {
    header: "Title",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("statusLabel", {
    header: "Status",
    cell: (info) => (
      <div
        className={clsx(
          "text-center font-semibold",
          info.row.original.status === "published" ? "text-brand-light" : ""
        )}
      >
        {info.getValue()}
      </div>
    ),
  }),
  columnHelper.accessor("datePublishedMs", {
    header: "Published date",
    cell: (info) => (
      <div className="text-center">
        {info.getValue() ? msToDatetimeLocalString(info.getValue()) : "-"}
      </div>
    ),
  }),
];

function statusLabelFor(status) {
  const statusCode = ITEM_STATUSES_STRINGS_DICT[status];
  if (statusCode !== undefined && ITEM_STATUSES_DICT[statusCode]) {
    return ITEM_STATUSES_DICT[statusCode].name;
  }
  return status;
}

function collectTagOptions(items) {
  const seen = new Set();
  items.forEach((item) => {
    (item.tags || []).forEach((tagValue) => seen.add(tagValue));
  });
  return Array.from(seen).sort();
}

function ItemTable({ rows }) {
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <table className="border-collapse text-helper-color text-sm w-full">
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th
                key={header.id}
                className="uppercase border border-slate-300 bg-brand-dark text-white py-2 px-4"
              >
                {flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td
                key={cell.id}
                className={clsx(
                  "border border-slate-300 py-2 px-4 break-all",
                  cell.column.id === "title" ? "max-w-md" : ""
                )}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ItemListView({ items, feed = {} }) {
  const [contentType, setContentType] = useState("");
  const [status, setStatus] = useState("");
  const [tag, setTag] = useState("");

  const typeOptions = useMemo(() => listTypes().map((typeDef) => typeDef.name), []);
  const tagOptions = useMemo(() => collectTagOptions(items), [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (contentType && item.content_type !== contentType) {
        return false;
      }
      if (status && item.status !== status) {
        return false;
      }
      if (tag && !(item.tags || []).includes(tag)) {
        return false;
      }
      return true;
    });
  }, [items, contentType, status, tag]);

  const rows = filteredItems.map((item) => ({
    id: item.id,
    contentType: item.content_type,
    status: item.status,
    statusLabel: statusLabelFor(item.status),
    datePublishedMs: item.date_published_ms,
    title: (
      <a className="block line-clamp-2 text-lg" href={ADMIN_URLS.editItem(item.id)}>
        {item.title || "untitled"}
      </a>
    ),
  }));

  let nextUrl;
  let prevUrl;
  if (feed.items_next_cursor) {
    nextUrl = `?next_cursor=${feed.items_next_cursor}&sort=${feed.items_sort_order}`;
  }
  if (feed.items_prev_cursor) {
    prevUrl = `?prev_cursor=${feed.items_prev_cursor}&sort=${feed.items_sort_order}`;
  }
  const newestFirst = feed.items_sort_order !== ITEMS_SORT_ORDERS.OLDEST_FIRST;

  if (items.length === 0) {
    return (
      <div>
        <div className="mb-8">No items yet.</div>
        <a href={ADMIN_URLS.newItem()}>
          Add a new item now <span className="lh-icon-arrow-right" />
        </a>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <AdminRadio
          groupName="sort-order"
          buttons={[
            {
              name: "Newest first",
              value: ITEMS_SORT_ORDERS.NEWEST_FIRST,
              checked: newestFirst,
            },
            {
              name: "Oldest first",
              value: ITEMS_SORT_ORDERS.OLDEST_FIRST,
              checked: !newestFirst,
            },
          ]}
          onChange={(e) => {
            location.href = `?sort=${e.target.value}`;
          }}
        />
      </div>
      <ItemFilters
        typeOptions={typeOptions}
        tagOptions={tagOptions}
        contentType={contentType}
        status={status}
        tag={tag}
        onContentTypeChange={setContentType}
        onStatusChange={setStatus}
        onTagChange={setTag}
      />
      {rows.length > 0 ? (
        <ItemTable rows={rows} />
      ) : (
        <div className="py-8 text-center text-helper-color">
          No items match the selected filters.
        </div>
      )}
      <div className="mt-8 flex justify-center">
        {prevUrl && (
          <div className="mx-2">
            <a href={prevUrl}>
              <span className="lh-icon-arrow-left" /> Prev
            </a>
          </div>
        )}
        {nextUrl && (
          <div className="mx-2">
            <a href={nextUrl}>
              Next <span className="lh-icon-arrow-right" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
