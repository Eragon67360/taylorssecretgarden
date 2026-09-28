"use client";

import { sanitisePostHtml } from "@/service/post-html";

// Posts are sanitised when they are published; sanitising again on render
// keeps rows written any other way from running scripts in the browser.
const PostContent = ({ content }: { content: string }) => {
	return <div dangerouslySetInnerHTML={{ __html: sanitisePostHtml(content) }} className="post-content" />;
};

export default PostContent;
