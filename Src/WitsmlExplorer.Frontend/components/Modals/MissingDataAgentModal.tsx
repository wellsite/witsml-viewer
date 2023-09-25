import { Accordion, Autocomplete, Button, Icon, Typography } from "@equinor/eds-core-react";
import { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import { v4 as uuid } from "uuid";
import OperationContext from "../../contexts/operationContext";
import OperationType from "../../contexts/operationType";
import MissingDataJob, { MissingDataCheck } from "../../models/jobs/missingDataJob";
import WellReference from "../../models/jobs/wellReference";
import WellboreReference from "../../models/jobs/wellboreReference";
import { ObjectType } from "../../models/objectType";
import JobService, { JobType } from "../../services/jobService";
import { Colors } from "../../styles/Colors";
import { StyledAccordionHeader } from "./LogComparisonModal";
import { objectToProperties, selectAllProperties } from "./MissingDataAgentProperties";
import ModalDialog, { ModalContentLayout, ModalWidth } from "./ModalDialog";
import { ReportModal } from "./ReportModal";

export interface MissingDataAgentModalProps {
  wellReferences: WellReference[];
  wellboreReferences: WellboreReference[];
}

export const missingDataObjectOptions = ["Well", "Wellbore", ...Object.values(ObjectType).filter((o) => o != ObjectType.ChangeLog)];

const MissingDataAgentModal = (props: MissingDataAgentModalProps): React.ReactElement => {
  const { wellReferences, wellboreReferences } = props;
  const {
    dispatchOperation,
    operationState: { colors }
  } = useContext(OperationContext);
  const [missingDataChecks, setMissingDataChecks] = useState<MissingDataCheck[]>([{ id: uuid() } as MissingDataCheck]);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    setErrors([]);
  }, [missingDataChecks]);

  const validateChecks = (): boolean => {
    const updatedErrors = [...errors];

    if (!missingDataChecks.some((check) => Boolean(check.objectType))) updatedErrors.push("No objects are selected!");
    if (missingDataChecks.some((check) => check.objectType == "Well" && check.properties.length == 0)) updatedErrors.push("Selecting properties is required for Wells.");
    if (missingDataChecks.some((check) => check.objectType == "Wellbore" && check.properties.length == 0 && wellReferences.length == 0))
      updatedErrors.push("Selecting properties is required for Wellbores when running Missing Data Agent on wellbores.");

    if (updatedErrors) setErrors(updatedErrors);

    return updatedErrors.length == 0;
  };

  const onSubmit = async () => {
    if (!validateChecks()) return;
    dispatchOperation({ type: OperationType.HideModal });
    const filteredChecks = missingDataChecks
      .map((check) => ({ ...check, properties: check.properties?.filter((p) => p !== selectAllProperties) }))
      .filter((check) => check.objectType != null);
    const missingDataJob: MissingDataJob = { wellReferences: wellReferences, wellboreReferences: wellboreReferences, missingDataChecks: filteredChecks };
    const jobId = await JobService.orderJob(JobType.MissingData, missingDataJob);
    const reportModalProps = { jobId };
    dispatchOperation({ type: OperationType.DisplayModal, payload: <ReportModal {...reportModalProps} /> });
  };

  const addCheck = () => {
    setMissingDataChecks([...missingDataChecks, { id: uuid() } as MissingDataCheck]);
  };

  const removeCheck = (id: string) => {
    setMissingDataChecks([...missingDataChecks.filter((check) => check.id != id)]);
  };

  const onObjectsChange = (selectedItems: string[], missingDataCheck: MissingDataCheck) => {
    setMissingDataChecks(missingDataChecks.map((oldCheck) => (oldCheck.id == missingDataCheck.id ? { ...oldCheck, objectType: selectedItems[0], properties: [] } : oldCheck)));
  };

  const onPropertiesChange = (selectedItems: string[], missingDataCheck: MissingDataCheck) => {
    let newSelectedItems = selectedItems;
    if (selectedItems.includes(selectAllProperties) != missingDataCheck.properties.includes(selectAllProperties)) {
      if (missingDataCheck.properties.length < objectToProperties[missingDataCheck.objectType].length) {
        newSelectedItems = objectToProperties[missingDataCheck.objectType];
      } else {
        newSelectedItems = [];
      }
    }
    setMissingDataChecks(missingDataChecks.map((oldCheck) => (oldCheck.id == missingDataCheck.id ? { ...oldCheck, properties: newSelectedItems } : oldCheck)));
  };

  const getPropertyLabel = (missingDataCheck: MissingDataCheck) => {
    const requiredString =
      missingDataCheck.objectType === "Well" || (missingDataCheck.objectType === "Wellbore" && wellboreReferences.length > 0)
        ? " (required)"
        : missingDataCheck.objectType
        ? " (optional)"
        : "";

    return `Select properties${requiredString}`;
  };

  return (
    <ModalDialog
      heading="Missing Data Agent"
      onSubmit={onSubmit}
      confirmColor={"primary"}
      errorMessage={errors.join(" ")}
      confirmText={`OK`}
      showCancelButton={true}
      width={ModalWidth.MEDIUM}
      isLoading={false}
      content={
        <ModalContentLayout>
          <Accordion style={{ paddingBottom: "30px" }}>
            <Accordion.Item>
              <StyledAccordionHeader colors={colors}>Missing Data Agent</StyledAccordionHeader>
              <Accordion.Panel style={{ backgroundColor: colors.ui.backgroundLight }}>
                <Typography style={{ whiteSpace: "pre-line" }}>
                  The missing data agent can be used to check if there are data in the selected objects or properties.
                  <br />
                  <br />
                  When leaving the properties field empty, the agent will check if the object is present.
                </Typography>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
          {missingDataChecks.map((missingDataCheck) => (
            <CheckLayout key={missingDataCheck.id}>
              <Autocomplete
                id={`object${missingDataCheck.id}`}
                label="Select object"
                options={missingDataObjectOptions}
                placeholder={missingDataCheck.objectType || ""}
                onFocus={(e) => e.preventDefault()}
                onOptionsChange={({ selectedItems }) => onObjectsChange(selectedItems, missingDataCheck)}
              />
              <Autocomplete
                id={`properties${missingDataCheck.id}`}
                disabled={!missingDataObjectOptions.includes(missingDataCheck.objectType)}
                label={getPropertyLabel(missingDataCheck)}
                multiple={true}
                placeholder={missingDataCheck.properties?.filter((p) => p != selectAllProperties).join(", ") || ""}
                options={objectToProperties[missingDataCheck.objectType]}
                selectedOptions={missingDataCheck.properties || []}
                onFocus={(e) => e.preventDefault()}
                onOptionsChange={({ selectedItems }) => onPropertiesChange(selectedItems, missingDataCheck)}
              />
              <Button variant="ghost_icon" style={{ alignSelf: "end" }} onClick={() => removeCheck(missingDataCheck.id)}>
                <Icon name="deleteToTrash" />
              </Button>
            </CheckLayout>
          ))}
          <StyledButton variant="contained_icon" onClick={addCheck}>
            <Icon name="add" />
          </StyledButton>
        </ModalContentLayout>
      }
    />
  );
};

export default MissingDataAgentModal;

const CheckLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr 0.2fr;
  gap: 10px;
`;

const StyledButton = styled(Button)<{ colors: Colors }>`
  align-self: center;
`;