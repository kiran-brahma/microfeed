/** @jest-environment jsdom */
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SchemaItemEditor from "./index";
import Requests from "../../../common/requests";

jest.mock("../../../common/requests", () => ({
  __esModule: true,
  default: {
    axiosGet: jest.fn(),
    axiosPost: jest.fn(),
    axiosPut: jest.fn(),
  },
}));

beforeEach(() => {
  Requests.axiosGet.mockReset();
  Requests.axiosPost.mockReset();
  Requests.axiosPut.mockReset();
  Requests.axiosGet.mockResolvedValue({ data: { tags: [] } });
  Requests.axiosPost.mockResolvedValue({ data: { items: [] } });
});

describe("SchemaItemEditor", () => {
  test("NEW: filling in title and saving calls axiosPost with content_type + title", async () => {
    const user = userEvent.setup();
    Requests.axiosPost.mockResolvedValue({ status: 201, data: { id: "new-id-123" } });

    render(<SchemaItemEditor contentType="blog_article" publicBucketUrl="https://cdn.example.com" />);

    // Locate the title text input via the surrounding label text "title".
    const titleLabel = screen.getByText(/^title/i);
    const titleContainer = titleLabel.closest("label") || titleLabel.parentElement;
    const input = titleContainer.querySelector("input");
    await user.type(input, "My New Post");

    const saveButton = screen.getByRole("button", { name: /save|create/i });
    await user.click(saveButton);

    expect(Requests.axiosPost).toHaveBeenCalledWith(
      "/admin/ajax/items",
      expect.objectContaining({ content_type: "blog_article", title: "My New Post" })
    );
  });

  test("EDIT: pre-populates from item, and saving calls axiosPut to /admin/ajax/items/{id} with updated payload", async () => {
    const user = userEvent.setup();
    Requests.axiosPut.mockResolvedValue({ status: 200, data: { id: "item-1" } });

    const item = {
      id: "item-1",
      content_type: "blog_article",
      title: "Original Title",
      content_html: "<p>Original</p>",
      excerpt: "orig excerpt",
    };

    render(
      <SchemaItemEditor
        contentType="blog_article"
        item={item}
        publicBucketUrl="https://cdn.example.com"
      />
    );

    expect(screen.getByDisplayValue("Original Title")).toBeInTheDocument();

    const titleInput = screen.getByDisplayValue("Original Title");
    await user.clear(titleInput);
    await user.type(titleInput, "Updated Title");

    const saveButton = screen.getByRole("button", { name: /save|update/i });
    await user.click(saveButton);

    expect(Requests.axiosPut).toHaveBeenCalledWith(
      "/admin/ajax/items/item-1",
      expect.objectContaining({ title: "Updated Title" })
    );
  });

  test("400 response with field errors shows the error under the corresponding field", async () => {
    const user = userEvent.setup();
    Requests.axiosPost.mockRejectedValue({
      response: {
        status: 400,
        data: { errors: [{ field: "title", message: "Title is required" }] },
      },
    });

    render(<SchemaItemEditor contentType="blog_article" publicBucketUrl="https://cdn.example.com" />);

    const saveButton = screen.getByRole("button", { name: /save|create/i });
    await user.click(saveButton);

    expect(await screen.findByText("Title is required")).toBeInTheDocument();
  });

  test("landing_page: renders the LandingPreview beneath the form and posts the current payload to the preview endpoint", async () => {
    render(<SchemaItemEditor contentType="landing_page" publicBucketUrl="https://cdn.example.com" />);

    await waitFor(() => {
      expect(Requests.axiosPost).toHaveBeenCalledWith(
        "/admin/ajax/aggregation/preview",
        expect.any(Object)
      );
    });
    expect(await screen.findByText(/no items match/i)).toBeInTheDocument();
  });

  test("landing_page: filter_tags uses the tag picker widget (loads tags) instead of the comma-separated fallback", async () => {
    render(<SchemaItemEditor contentType="landing_page" publicBucketUrl="https://cdn.example.com" />);

    await waitFor(() => {
      expect(Requests.axiosGet).toHaveBeenCalledWith("/admin/ajax/tags");
    });
    expect(screen.queryByPlaceholderText("comma, separated, values")).not.toBeInTheDocument();
  });

  test("non-landing content types do not render the LandingPreview", () => {
    render(<SchemaItemEditor contentType="blog_article" publicBucketUrl="https://cdn.example.com" />);

    expect(screen.queryByText(/no items match/i)).not.toBeInTheDocument();
  });

  test("keeps primary save actions in a sticky editor header and metadata in the right rail", () => {
    render(<SchemaItemEditor contentType="blog_article" publicBucketUrl="https://cdn.example.com" />);

    const header = screen.getByRole("banner", { name: /editor header/i });
    const metadataRail = screen.getByRole("complementary", { name: /metadata rail/i });

    expect(within(header).getByRole("button", { name: /create/i })).toBeInTheDocument();
    expect(within(metadataRail).getByRole("textbox", { name: /url slug/i })).toBeInTheDocument();
    expect(within(metadataRail).getByRole("combobox", { name: /status/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /collapse metadata/i })).toBeInTheDocument();
  });
});
