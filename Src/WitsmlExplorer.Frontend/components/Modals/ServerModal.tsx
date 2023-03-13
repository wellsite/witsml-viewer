import { Button, TextField, Label } from "@equinor/eds-core-react";
import React, { ChangeEvent, useContext, useState } from "react";
import styled from "styled-components";
import { RemoveWitsmlServerAction } from "../../contexts/modificationActions";
import ModificationType from "../../contexts/modificationType";
import { SelectServerAction } from "../../contexts/navigationActions";
import NavigationContext from "../../contexts/navigationContext";
import NavigationType from "../../contexts/navigationType";
import OperationContext from "../../contexts/operationContext";
import { DisplayModalAction, HideModalAction } from "../../contexts/operationStateReducer";
import OperationType from "../../contexts/operationType";
import { Server } from "../../models/server";
import { msalEnabled } from "../../msal/MsalAuthProvider";
import NotificationService from "../../services/notificationService";
import ServerService from "../../services/serverService";
import { colors } from "../../styles/Colors";
import ModalDialog, { controlButtonPosition, ModalWidth } from "./ModalDialog";
import UserCredentialsModal, { UserCredentialsModalProps } from "./UserCredentialsModal";
import { CSSProperties } from "@material-ui/core/styles/withStyles";
import Icons from "../../styles/Icons";

export interface ServerModalProps {
  server: Server;
  editDisabled: boolean;
}

const ServerModal = (props: ServerModalProps): React.ReactElement => {
  const {
    navigationState: { selectedServer },
    dispatchNavigation
  } = useContext(NavigationContext);
  const { dispatchOperation } = useContext(OperationContext);
  const [server, setServer] = useState<Server>(props.server);
  const [connectionVerified, setConnectionVerified] = useState<boolean>(false);
  const [displayUrlError, setDisplayUrlError] = useState<boolean>(false);
  const [displayNameError, setDisplayServerNameError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const isAddingNewServer = props.server.id === undefined;

  const Styles: CSSProperties = {
    feildname: { fontSize: "1rem", fontWeight: 500, color: colors.text.staticIconsDefault, paddingLeft: "0.9rem" }
  };
  const onSubmit = async () => {
    const abortController = new AbortController();

    setIsLoading(true);
    try {
      if (isAddingNewServer) {
        const freshServer = await ServerService.addServer(server, abortController.signal);
        dispatchNavigation({ type: ModificationType.AddServer, payload: { server: freshServer } });
      } else {
        const freshServer = await ServerService.updateServer(server, abortController.signal);
        dispatchNavigation({ type: ModificationType.UpdateServer, payload: { server: freshServer } });
      }
    } catch (error) {
      NotificationService.Instance.alertDispatcher.dispatch({
        serverUrl: null,
        message: error.message,
        isSuccess: false
      });
    } finally {
      setIsLoading(false);
      dispatchOperation({ type: OperationType.HideModal });
    }
  };

  const showCredentialsModal = () => {
    const onVerifyConnection = () => {
      setConnectionVerified(true);
      dispatchOperation({ type: OperationType.HideModal });
    };

    const userCredentialsModalProps: UserCredentialsModalProps = {
      server,
      confirmText: "Test",
      onConnectionVerified: onVerifyConnection
    };
    dispatchOperation({ type: OperationType.DisplayModal, payload: <UserCredentialsModal {...userCredentialsModalProps} /> });
  };

  const showDeleteModal = () => {
    dispatchOperation({ type: OperationType.HideModal });
    showDeleteServerModal(server, dispatchOperation, dispatchNavigation, selectedServer);
  };

  const runServerNameValidation = () => {
    setDisplayServerNameError(server.name.length === 0);
  };

  const runUrlValidation = () => {
    setDisplayUrlError(!isUrlValid(server.url));
  };

  const validateForm = () => {
    return server.name.length !== 0 && isUrlValid(server.url);
  };

  const onChangeUrl = (e: ChangeEvent<HTMLInputElement>) => {
    setConnectionVerified(false);
    if (displayUrlError) {
      runUrlValidation();
    }
    setServer({ ...server, url: e.target.value });
  };

  const onChangeName = (e: ChangeEvent<HTMLInputElement>) => {
    if (displayNameError) {
      runServerNameValidation();
    }
    setServer({ ...server, name: e.target.value });
  };

  return (
    <ModalDialog
      heading={`${isAddingNewServer ? "Add" : "Edit"} server`}
      content={
        <>
          <ContentWrapper>
            <Label label="Server URL" style={Styles.feildname} />
            <TextField
              id="url"
              defaultValue={server.url}
              variant={displayUrlError ? "error" : null}
              helperText={displayUrlError ? "Not a valid server url" : ""}
              onChange={onChangeUrl}
              onBlur={runUrlValidation}
              required
              disabled={props.editDisabled}
            />
            <Label label="Server name" style={Styles.feildname} />
            <TextField
              id="name"
              defaultValue={server.name}
              variant={displayNameError ? "error" : null}
              helperText={displayNameError ? "A server name must have 1-64 characters" : ""}
              onBlur={runServerNameValidation}
              onChange={onChangeName}
              required
              disabled={props.editDisabled}
            />
            <Label label="Server description" style={Styles.feildname} />
            <TextField
              id="description"
              defaultValue={server.description}
              onChange={(e: any) => setServer({ ...server, description: e.target.value })}
              disabled={props.editDisabled}
            />
            {msalEnabled && (
              <>
                <Label label="Roles" style={Styles.feildname} />
                <TextField
                  id="role"
                  defaultValue={server.roles?.join(" ")}
                  onChange={(e: any) => setServer({ ...server, roles: e.target.value.split(" ") })}
                  disabled={props.editDisabled}
                />
              </>
            )}
            <ButtonWrapper>
              {connectionVerified && <Icons name="done" color={colors.interactive.primaryResting} size={32} />}
              <TestServerButton disabled={displayUrlError || connectionVerified} onClick={showCredentialsModal} color={"primary"} variant="outlined">
                {"Test connection"}
              </TestServerButton>
            </ButtonWrapper>
          </ContentWrapper>
        </>
      }
      onSubmit={onSubmit}
      isLoading={isLoading}
      onDelete={server.id && !props.editDisabled ? showDeleteModal : null}
      ButtonPosition={controlButtonPosition.TOP}
      confirmDisabled={props.editDisabled || !validateForm()}
      width={ModalWidth.LARGE}
    />
  );
};

export const showDeleteServerModal = (
  server: Server,
  dispatchOperation: (action: HideModalAction | DisplayModalAction) => void,
  dispatchNavigation: (action: SelectServerAction | RemoveWitsmlServerAction) => void,
  selectedServer: Server
) => {
  const onCancel = () => {
    dispatchOperation({ type: OperationType.HideModal });
  };
  const onConfirm = async () => {
    const abortController = new AbortController();
    try {
      await ServerService.removeServer(server.id, abortController.signal);
      dispatchNavigation({ type: ModificationType.RemoveServer, payload: { serverUid: server.id } });
      if (server.id === selectedServer?.id) {
        const action: SelectServerAction = { type: NavigationType.SelectServer, payload: { server: null } };
        dispatchNavigation(action);
      }
    } catch (error) {
      NotificationService.Instance.alertDispatcher.dispatch({
        serverUrl: new URL(server.url),
        message: error.message,
        isSuccess: false
      });
    } finally {
      dispatchOperation({ type: OperationType.HideModal });
    }
  };
  const confirmModal = (
    <ModalDialog
      heading={`Remove the server "${server.name}"?`}
      content={<>Removing a server will permanently remove it from the list.</>}
      confirmColor={"danger"}
      confirmText={"Remove server"}
      onCancel={onCancel}
      onSubmit={onConfirm}
      isLoading={false}
      switchButtonPlaces={true}
    />
  );
  dispatchOperation({ type: OperationType.DisplayModal, payload: confirmModal });
};

const isUrlValid = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};
const ContentWrapper = styled.div`
  display: grid;
  grid-template-columns: 11em 1fr;
  align-items: center;
  margin: 0.5rem 6rem 0.75rem 2.5rem;
  row-gap: 1.5rem;
`;

const TestServerButton = styled(Button)`
  && {
    margin-left: 1em;
  }
`;
const ButtonWrapper = styled.div`
  grid-column: 2/3;
  display: flex;
  align-items: end;
  justify-content: flex-end;
`;

export default ServerModal;
