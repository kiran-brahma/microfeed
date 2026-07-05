/** @jest-environment jsdom */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SchemaItemEditor from "./index";
import Requests from "../../../common/requests";

jest.mock("../../../common/requests", () => ({
  __esModule: true,
  default: {
    axiosPost: jest.fn(),
    axiosPut: jest.fn(),
  },
}));

beforeEach(() => {
  Requests.axiosPost.mockReset();
  Requests.axiosPut.mockReset();
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
});
