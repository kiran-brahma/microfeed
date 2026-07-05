/** @jest-environment jsdom */
import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ItemListView from "./ItemListView";

function makeFeed(overrides = {}) {
  return {
    items_next_cursor: null,
    items_prev_cursor: null,
    items_sort_order: "newest_first",
    settings: {
      webGlobalSettings: {
        publicBucketUrl: "https://cdn.example.com",
      },
    },
    ...overrides,
  };
}

const PODCAST_ITEM = {
  id: "ep-1",
  content_type: "podcast_episode",
  slug: "episode-one",
  status: "published",
  title: "Episode One",
  date_published_ms: 1717200000000,
  tags: [],
};

const BLOG_ITEM = {
  id: "post-1",
  content_type: "blog_article",
  slug: "hello-world",
  status: "unpublished",
  title: "Hello World",
  date_published_ms: 1717286400000,
  tags: ["news", "eng"],
};

const PHOTO_ITEM = {
  id: "photo-1",
  content_type: "photo",
  slug: "sunset",
  status: "unlisted",
  title: "Sunset",
  date_published_ms: 1717372800000,
  tags: ["nature"],
};

const MIXED_ITEMS = [PODCAST_ITEM, BLOG_ITEM, PHOTO_ITEM];

describe("ItemListView", () => {
  test("renders rows for a mixed list, each showing type badge + title + readable status", () => {
    render(<ItemListView items={MIXED_ITEMS} feed={makeFeed()} />);

    expect(screen.getByText("Episode One")).toBeInTheDocument();
    expect(screen.getByText("Hello World")).toBeInTheDocument();
    expect(screen.getByText("Sunset")).toBeInTheDocument();

    const table = screen.getByRole("table");
    expect(within(table).getByText("Podcast Episode")).toBeInTheDocument();
    expect(within(table).getByText("Blog Article")).toBeInTheDocument();
    expect(within(table).getByText("Photo")).toBeInTheDocument();

    expect(within(table).getByText("published")).toBeInTheDocument();
    expect(within(table).getByText("unpublished")).toBeInTheDocument();
    expect(within(table).getByText("unlisted")).toBeInTheDocument();
  });

  test("content-type filter narrows to only that type", async () => {
    const user = userEvent.setup();
    render(<ItemListView items={MIXED_ITEMS} feed={makeFeed()} />);

    const typeFilter = screen.getByLabelText(/content type/i);
    await user.selectOptions(typeFilter, "blog_article");

    expect(screen.getByText("Hello World")).toBeInTheDocument();
    expect(screen.queryByText("Episode One")).not.toBeInTheDocument();
    expect(screen.queryByText("Sunset")).not.toBeInTheDocument();
  });

  test("status filter = Published hides unpublished/unlisted items", async () => {
    const user = userEvent.setup();
    render(<ItemListView items={MIXED_ITEMS} feed={makeFeed()} />);

    const statusFilter = screen.getByLabelText(/^status/i);
    await user.selectOptions(statusFilter, "published");

    expect(screen.getByText("Episode One")).toBeInTheDocument();
    expect(screen.queryByText("Hello World")).not.toBeInTheDocument();
    expect(screen.queryByText("Sunset")).not.toBeInTheDocument();
  });

  test("tag filter narrows to items containing that tag", async () => {
    const user = userEvent.setup();
    render(<ItemListView items={MIXED_ITEMS} feed={makeFeed()} />);

    const tagFilter = screen.getByLabelText(/tag/i);
    await user.selectOptions(tagFilter, "nature");

    expect(screen.getByText("Sunset")).toBeInTheDocument();
    expect(screen.queryByText("Episode One")).not.toBeInTheDocument();
    expect(screen.queryByText("Hello World")).not.toBeInTheDocument();
  });

  test("a filter combination matching nothing shows the empty-state message", async () => {
    const user = userEvent.setup();
    render(<ItemListView items={MIXED_ITEMS} feed={makeFeed()} />);

    const typeFilter = screen.getByLabelText(/content type/i);
    await user.selectOptions(typeFilter, "blog_article");
    const statusFilter = screen.getByLabelText(/^status/i);
    await user.selectOptions(statusFilter, "published");

    expect(screen.getByText(/no items match/i)).toBeInTheDocument();
    expect(screen.queryByText("Hello World")).not.toBeInTheDocument();
  });

  test("combining filters is AND: type+status+tag together", async () => {
    const user = userEvent.setup();
    render(<ItemListView items={MIXED_ITEMS} feed={makeFeed()} />);

    const typeFilter = screen.getByLabelText(/content type/i);
    await user.selectOptions(typeFilter, "blog_article");
    const tagFilter = screen.getByLabelText(/tag/i);
    await user.selectOptions(tagFilter, "news");

    expect(screen.getByText("Hello World")).toBeInTheDocument();

    const statusFilter = screen.getByLabelText(/^status/i);
    await user.selectOptions(statusFilter, "unpublished");
    expect(screen.getByText("Hello World")).toBeInTheDocument();

    await user.selectOptions(statusFilter, "published");
    expect(screen.getByText(/no items match/i)).toBeInTheDocument();
  });

  test("rows link to the edit page for the item id", () => {
    render(<ItemListView items={MIXED_ITEMS} feed={makeFeed()} />);

    const link = screen.getByRole("link", { name: /Episode One/i });
    expect(link.getAttribute("href")).toBe("/admin/items/ep-1/");
  });

  test("empty items list shows the friendly no-items message with add-new link", () => {
    render(<ItemListView items={[]} feed={makeFeed()} />);

    expect(screen.getByText(/no items yet/i)).toBeInTheDocument();
  });
});
