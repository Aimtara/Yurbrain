# Yurbrain GraphQL examples (Hasura/Nhost)

Examples assume:

- role: `user`
- `X-Hasura-User-Id` is present in JWT claims
- owner-scoped permissions + insert presets are configured

## 1) Create capture (`brain_items`)

```graphql
mutation CreateCapture($object: brain_items_insert_input!) {
  insert_brain_items_one(object: $object) {
    id
    user_id
    type
    title
    raw_content
    source_link
    processing_status
    created_at
  }
}
```

Variables:

```json
{
  "object": {
    "type": "note",
    "title": "Stripe webhook retry issue",
    "raw_content": "Investigate duplicate webhook deliveries",
    "source_link": "https://dashboard.stripe.com/events",
    "content_type": "text",
    "metadata": {
      "source_app": "mobile_capture",
      "intent": "follow_up"
    }
  }
}
```

---

## 2) List current user captures

```graphql
query ListMyCaptures($limit: Int = 30, $offset: Int = 0) {
  brain_items(limit: $limit, offset: $offset, order_by: { created_at: desc }) {
    id
    type
    title
    raw_content
    processing_status
    created_at
    updated_at
  }
}
```

---

## 3) Update capture

```graphql
mutation UpdateCapture($id: uuid!, $patch: brain_items_set_input!) {
  update_brain_items_by_pk(pk_columns: { id: $id }, _set: $patch) {
    id
    title
    raw_content
    normalized_content
    processing_status
    updated_at
  }
}
```

Variables:

```json
{
  "id": "00000000-0000-4000-8000-000000000001",
  "patch": {
    "title": "Stripe webhook retries",
    "normalized_content": "Investigate duplicate webhook deliveries from Stripe.",
    "processing_status": "ready"
  }
}
```

---

## 4) Delete capture

```graphql
mutation DeleteCapture($id: uuid!) {
  delete_brain_items_by_pk(id: $id) {
    id
  }
}
```

---

## 5) Add tag to capture

Step A: create/find tag (create example):

```graphql
mutation CreateTag($object: tags_insert_input!) {
  insert_tags_one(object: $object) {
    id
    name
  }
}
```

Step B: attach to capture:

```graphql
mutation AddTagToCapture($object: capture_tags_insert_input!) {
  insert_capture_tags_one(object: $object) {
    id
    capture_id
    tag_id
    created_at
  }
}
```

Variables:

```json
{
  "object": {
    "capture_id": "00000000-0000-4000-8000-000000000001",
    "tag_id": "00000000-0000-4000-8000-0000000000aa"
  }
}
```

---

## 6) Create collection

```graphql
mutation CreateCollection($object: collections_insert_input!) {
  insert_collections_one(object: $object) {
    id
    name
    description
    created_at
  }
}
```

Variables:

```json
{
  "object": {
    "name": "Startup Ideas",
    "description": "Themes and opportunities to revisit weekly",
    "color": "#6D28D9"
  }
}
```

---

## 7) Add capture to collection

```graphql
mutation AddCaptureToCollection($object: collection_items_insert_input!) {
  insert_collection_items_one(object: $object) {
    id
    collection_id
    capture_id
    position
    created_at
  }
}
```

Variables:

```json
{
  "object": {
    "collection_id": "00000000-0000-4000-8000-0000000000c1",
    "capture_id": "00000000-0000-4000-8000-000000000001",
    "position": 10
  }
}
```

---

## 8) Upload attachment metadata (after storage upload)

```graphql
mutation CreateAttachment($object: attachments_insert_input!) {
  insert_attachments_one(object: $object) {
    id
    item_id
    bucket
    object_key
    mime_type
    size_bytes
    status
    created_at
  }
}
```

Variables:

```json
{
  "object": {
    "item_id": "00000000-0000-4000-8000-000000000001",
    "bucket": "capture_assets",
    "object_key": "user/00000000-0000-4000-8000-000000000099/captures/00000000-0000-4000-8000-000000000001/asset-1234.png",
    "kind": "image",
    "mime_type": "image/png",
    "size_bytes": 248190,
    "status": "uploaded",
    "metadata": {
      "width": 1170,
      "height": 2532
    }
  }
}
```

---

## 9) Nhost storage SDK upload examples

### Web/mobile client upload to private `capture_assets` bucket

```ts
import { getWebNhostClient } from "@/src/nhost/client";

const nhost = getWebNhostClient();
const session = nhost.getUserSession();
if (!session?.user?.id) throw new Error("User session required");

const userId = session.user.id;
const captureId = "00000000-0000-4000-8000-000000000001";
const file = new File(["hello"], "note.txt", { type: "text/plain" });
const objectKey = `user/${userId}/captures/${captureId}/${crypto.randomUUID()}-note.txt`;

const upload = await nhost.storage.upload({
  bucketId: "capture_assets",
  file,
  id: objectKey
});
if (upload.error) throw new Error(upload.error.message);
```

### Client-side signed download URL (private buckets)

```ts
const signed = await nhost.storage.getPresignedUrl({
  bucketId: "capture_assets",
  fileId: objectKey
});
if (signed.error) throw new Error(signed.error.message);
console.log(signed.presignedUrl);
```

### Client-side delete (owner-only)

```ts
const deleted = await nhost.storage.delete({
  bucketId: "capture_assets",
  fileId: objectKey
});
if (deleted.error) throw new Error(deleted.error.message);
```

---

## 10) Link uploaded object to `attachments` row

```graphql
mutation CreateAttachment($object: attachments_insert_input!) {
  insert_attachments_one(object: $object) {
    id
    user_id
    item_id
    bucket
    object_key
    kind
    mime_type
    size_bytes
    status
    created_at
  }
}
```

Variables:

```json
{
  "object": {
    "item_id": "00000000-0000-4000-8000-000000000001",
    "bucket": "capture_assets",
    "object_key": "user/00000000-0000-4000-8000-000000000099/captures/00000000-0000-4000-8000-000000000001/asset-1234.png",
    "kind": "image",
    "mime_type": "image/png",
    "size_bytes": 248190,
    "status": "uploaded",
    "metadata": {
      "width": 1170,
      "height": 2532
    }
  }
}
```

---

## 11) List my attachments for a capture

```graphql
query ListCaptureAttachments($captureId: uuid!) {
  attachments(
    where: { item_id: { _eq: $captureId } }
    order_by: { created_at: desc }
  ) {
    id
    bucket
    object_key
    kind
    mime_type
    size_bytes
    status
    created_at
  }
}
```

---

## 12) Soft-delete attachment metadata

```graphql
mutation MarkAttachmentDeleted($id: uuid!) {
  update_attachments_by_pk(
    pk_columns: { id: $id }
    _set: { status: "deleted" }
  ) {
    id
    status
    updated_at
  }
}
```

---

## 13) List captures by tag

```graphql
query ListCapturesByTag($tagId: uuid!, $limit: Int = 30) {
  capture_tags(
    where: { tag_id: { _eq: $tagId } }
    limit: $limit
    order_by: { created_at: desc }
  ) {
    capture_id
    capture: brain_item {
      id
      title
      type
      created_at
      updated_at
    }
  }
}
```

---

## 14) List collection items

```graphql
query ListCollectionItems($collectionId: uuid!, $limit: Int = 100) {
  collection_items(
    where: { collection_id: { _eq: $collectionId } }
    limit: $limit
    order_by: [{ position: asc }, { created_at: desc }]
  ) {
    id
    position
    capture: brain_item {
      id
      title
      type
      raw_content
      created_at
    }
  }
}
```
