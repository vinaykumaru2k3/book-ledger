import { detailsBookFromItem, formFromItem } from "../../services/bookApi";
import { useModal, useUi } from "../../app/AppContext";

/** What a Discover card can do: add the book to the library, or open its details. */
export function useDiscoverActions() {
  const { quickAdd } = useModal();
  const { openDetails } = useUi();
  return {
    quickAdd: (item) => quickAdd(formFromItem(item)),
    viewDetails: (item) => openDetails(detailsBookFromItem(item)),
  };
}
