ALTER TABLE "InventoryItem"
ADD COLUMN "restockFrequencyDays" INTEGER;

ALTER TABLE "InventoryItemRevision"
ADD COLUMN "restockFrequencyDays" INTEGER;
