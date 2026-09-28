"use client";

import DOMPurify from "isomorphic-dompurify";

// Posts are sanitised when they are published; sanitising again on render
// keeps rows written any other way from running scripts in the browser.
const PostContent = ({ content }: { content: string }) => {
	return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} className="post-content" />;
};

export default PostContent;
