import React, { Component } from "react";
import Kalimba from "../components/Kalimba";
import { connect } from "react-redux";
import { getInstruments } from "mobx-music";
import { delay } from "q";
import NoteButton from "../components/NoteButton";
import AccidentalButton from "../components/AccidentalButton";
import {
  FaPlay,
  FaStop,
  FaSave,
  FaFolderOpen,
  FaFileExport,
  FaHome,
} from "react-icons/fa";
import { Button } from "react-bootstrap";
import * as html2canvas from "html2canvas";
import * as jsPDF from "jspdf";
import ClipLoader from "react-spinners/ClipLoader";
import QuarterRest from "../kalimbaImages/restImages/quarter_rest.png";

var app = window.require("electron").remote;
const fs = app.require("fs");

class TabCreator extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentNoteIndex: -1,
      kalimba: null,
      playing: false,
      isStopped: false,
      editTitle: false,
      editTempo: false,
      exporting: false,
      height: window.innerHeight,
    };
  }

  /**
   * Saves the song in the form of its redux array to the file system
   * @return {void} returns early if the user cancels
   */
  saveSong = async () => {
    //create kalimba folder if it doesn't exist
    let docpath = app.app.getPath("documents") + "/KalimbaTabs";
    if (!fs.existsSync(docpath)) {
      fs.mkdir(docpath, (err) => {
        if (err) alert(err);
      });
    }
    let options = {
      title: this.props.songTitle,
      defaultPath:
        app.app.getPath("documents") +
        "/KalimbaTabs/" +
        this.props.songTitle +
        ".kal",
    };
    app.dialog.showSaveDialog(options).then((file) => {
      if (file.canceled) {
        return;
      }
      let contentToSave = {
        songTitle: this.props.songTitle,
        tempo: this.props.tempo,
        tineNotes: this.props.tineNotes,
        song: this.props.song,
      };
      fs.writeFile(file.filePath, JSON.stringify(contentToSave), (err) => {
        if (err) {
          alert("An error occurred while saving " + err.message);
        } else {
          alert("Successfully saved '" + this.props.songTitle + "'");
        }
      });
    });
  };

  /**
   * Opens a .kal file from the user's KalimbaTabs folder
   * @return {void} returns early if an error occurs opening the song
   */
  openSong = () => {
    //create kalimba folder if it doesn't exist
    let docpath = app.app.getPath("documents") + "/KalimbaTabs";
    if (!fs.existsSync(docpath)) {
      fs.mkdir(docpath, (err) => {
        if (err) alert(err);
      });
    }
    let options = {
      defaultPath: app.app.getPath("documents") + "/KalimbaTabs",
    };
    app.dialog.showOpenDialog(options).then((files) => {
      fs.readFile(files.filePaths[0], "utf-8", (err, data) => {
        if (err) {
          alert("An error occurred reading the file(s)" + err.message);
          return;
        }
        this.setState({ editTitle: false, editTempo: false });
        this.props.openSong(JSON.parse(data));
      });
    });
  };

  /**
   * Stops the song playback
   */
  stopSong = () => {
    this.setState({ isStopped: true, playing: false, currentNoteIndex: -1 });
  };

  /**
   * Plays the song by going through the redux song array
   * and collecting the locations with notes
   */
  playSong = async () => {
    this.setState({ playing: true });
    let kalimbaElement = document.getElementById("kalimbaContainer");
    kalimbaElement.scrollTop = kalimbaElement.scrollHeight;
    let delayConstant = 4 * (1000 / (this.props.tempo / 60));
    let optimizedSong = [];

    //go through the song array and pick out only the notes that need to be played
    for (let i = this.props.song[0].length - 1; i >= 0; i--) {
      let notesToPlay = { notes: [], time: 4 };
      let shortestInterval = -1;
      for (let j = 0; j < 17; j++) {
        let noteToAdd = "";
        if (this.props.song[j][i].note !== "") {
          noteToAdd = this.props.song[j][i].note;
        } else {
          continue;
        }
        if (shortestInterval < this.props.song[j][i].time) {
          shortestInterval = this.props.song[j][i].time;
        }
        notesToPlay.notes.push(noteToAdd);
        notesToPlay.time = shortestInterval;
      }
      optimizedSong.push(notesToPlay);
    }

    //go through optimizedSong
    for (let i = 0; i < optimizedSong.length; i++) {
      this.setState({ currentNoteIndex: optimizedSong.length - 1 - i });
      if (this.state.isStopped) {
        this.setState({ currentNoteIndex: -1 });
        break;
      }
      kalimbaElement.scrollTop =
        kalimbaElement.scrollHeight - 50 * i - (window.innerHeight - 200);
      for (let j = 0; j < optimizedSong[i].notes.length; j++) {
        if (optimizedSong[i].notes[j] !== "rest") {
          this.state.kalimba.play(optimizedSong[i].notes[j]);
        }
      }
      await delay(delayConstant / optimizedSong[i].time);
    }

    this.setState({ isStopped: false });
  };

  /**
   * Converts the kalimbaContainer element into a pdf.
   * Needs to scroll up every time it takes a snapshot of
   * the element.
   */
  exportToPDF = async () => {
    this.setState({ exporting: true });
    let input = document.getElementById("kalimbaContainer");
    let pdf = new jsPDF();
    input.scrollTop = input.scrollHeight; //go to bottom of kalimba
    while (input.scrollTop !== 0) {
      //take pic
      html2canvas(input).then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, 0);
      });
      //scroll up
      input.scrollTop -= input.offsetHeight - 50;
      await delay(1);
    }
    input.scrollTop = input.scrollHeight;
    //save pdf
    pdf.save(this.props.songTitle + ".pdf");
    this.setState({ exporting: false });
  };

  /**
   * Updates dimensions of kalimba to that of the window's height
   */
  updateDimensions() {
    this.setState({ height: window.innerHeight });
  }

  componentDidMount = async () => {
    //set up kalimba
    const { instruments } = await getInstruments(["kalimba"]);
    this.setState({ kalimba: instruments.get("kalimba") });
    //set window resize event listener
    this.updateDimensions();
    window.addEventListener("resize", () => {
      this.updateDimensions();
    });
  };

  componentWillUnmount = () => {
    window.removeEventListener("resize", () => {
      this.updateDimensions();
    });
  };

  render() {
    return (
      <div style={styles.tabCreatorContainer}>
        <div style={{ flex: 1 }}></div>
        {/* KALIMBA */}
        <div
          style={{
            flex: 2,
            display: "flex",
            height: this.state.height,
            overflow: "auto",
            justifyContent: "center",
          }}
          id="kalimbaContainer"
        >
          {/* wait for kalimba to load */}
          {this.state.kalimba !== null && (
            <Kalimba
              kalimba={this.state.kalimba}
              currentNote={this.state.currentNoteIndex}
            />
          )}
        </div>
        <div style={{ flex: 1 }}></div>
        <div style={styles.controlPanelContainer}>
          {/* SONG CONTROL */}
          <div style={styles.songControlContainer}>
            {/* HOME BUTTON */}
            <div
              style={{ margin: 30 }}
              onClick={() => {
                this.props.history.push("/");
              }}
            >
              <FaHome size={30} />
            </div>

            {/* SAVE */}
            <div
              style={{ margin: 10 }}
              onClick={() => {
                this.saveSong();
              }}
            >
              <FaSave size={30} />
            </div>
            {/* OPEN */}
            <div
              style={{ margin: 10 }}
              onClick={() => {
                this.openSong();
              }}
            >
              <FaFolderOpen size={30} />
            </div>
            {/* EXPORT */}
            {this.state.exporting ? (
              <ClipLoader size={20} />
            ) : (
              <div
                style={{ margin: 10 }}
                onClick={() => {
                  this.exportToPDF();
                }}
              >
                <FaFileExport size={30} />
              </div>
            )}
            {/* PLAY BUTTON */}
            <div
              onClick={() => {
                this.state.playing ? this.stopSong() : this.playSong();
              }}
              style={{ margin: 10 }}
            >
              {this.state.playing ? (
                <FaStop color="red" size={30} />
              ) : (
                <FaPlay color="blue" size={30} />
              )}
            </div>
          </div>
          {/* TITLE INPUT */}
          <div style={styles.titleContainer}>
            {!this.state.editTitle ? (
              <div
                onClick={() => {
                  this.setState({ editTitle: true });
                }}
                style={{ margin: 5, fontSize: 30, fontWeight: "bold" }}
              >
                {this.props.songTitle}
              </div>
            ) : (
              <input
                placeholder={this.props.songTitle}
                onKeyPress={(event) => {
                  if (event.key === "Enter") {
                    this.setState({ editTitle: false });
                  }
                }}
                style={styles.titleInput}
                onChange={(e) => {
                  this.props.changeTitle(e.target.value);
                }}
              />
            )}
            {!this.state.editTempo ? (
              <div
                onClick={() => {
                  this.setState({ editTempo: true });
                }}
                style={{ margin: 5 }}
              >
                {this.props.tempo}
              </div>
            ) : (
              <input
                onKeyPress={(event) => {
                  if (event.key === "Enter") {
                    this.setState({ editTempo: false });
                  }
                }}
                placeholder={this.props.tempo}
                style={styles.tempoInput}
                type="number"
                min="0"
                onChange={(e) => {
                  this.props.changeTempo(e.target.value);
                }}
              />
            )}
          </div>
          {/* NOTE TOOLBAR */}
          <div style={styles.noteToolbarContainer}>
            <NoteButton value={1} />
            <NoteButton value={2} />
            <NoteButton value={4} />
            <NoteButton value={8} />
            <NoteButton value={16} />
            <div style={styles.noteToolbarDivider} />
            <AccidentalButton value="♯" />
            <AccidentalButton value="♭" />
            <AccidentalButton value="♮" />
            <div style={styles.noteToolbarDivider} />
            {/* DOTTED BUTTON */}
            <Button
              variant="outline-primary"
              style={{
                margin: 5,
                backgroundColor: this.props.dotted ? "blue" : "white",
              }}
              onClick={() => {
                this.props.toggleDotted();
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: this.props.dotted ? "white" : "blue",
                }}
              />
            </Button>
            {/* REST BUTTON */}
            <Button
              variant="outline-primary"
              style={{
                margin: 5,
                backgroundColor: this.props.rest ? "blue" : "white",
                color: this.props.rest ? "white" : "blue",
              }}
              onClick={() => {
                this.props.toggleRest();
              }}
            >
              <img
                src={QuarterRest}
                style={{ width: 15, height: "auto" }}
                alt={"resticon"}
              />
            </Button>
            {/* TRIPLET BUTTON */}
            <Button
              variant="outline-primary"
              style={{
                margin: 5,
                backgroundColor: this.props.tripletMode ? "blue" : "white",
                color: this.props.tripletMode ? "white" : "blue",
              }}
              onClick={() => {
                this.props.toggleTriplet();
              }}
            >
              3
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

/**
 * Redux functions
 */
const mapStateToProps = (state) => {
  return {
    test: state.test,
    tineNotes: state.tineNotes,
    song: state.song,
    tempo: state.tempo,
    songTitle: state.songTitle,
    dotted: state.dotted,
    rest: state.rest,
    tripletMode: state.tripletMode,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    toggleDotted: () => dispatch({ type: "TOGGLEDOTTED" }),
    openSong: (data) => dispatch({ type: "OPENSONG", data: data }),
    changeTitle: (title) => dispatch({ type: "CHANGETITLE", title: title }),
    toggleRest: () => dispatch({ type: "TOGGLEREST" }),
    changeTempo: (tempo) => dispatch({ type: "CHANGETEMPO", tempo: tempo }),
    toggleTriplet: () => dispatch({ type: "TOGGLETRIPLET" }),
  };
};

/**
 * Styling
 */
const divCenteredContent = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  flexDirection: "row",
};

const styles = {
  tabCreatorContainer: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "row",
  },

  controlPanelContainer: {
    position: "absolute",
    top: 0,
    ...divCenteredContent,
    left: "-5%",
    width: "110%",
    boxShadow: "0px 5px 5px grey",
    height: 60,
    backgroundColor: "white",
  },
  noteToolbarContainer: {
    flex: 2,
    ...divCenteredContent,
  },
  noteToolbarDivider: {
    height: 50,
    width: 2,
    backgroundColor: "lightgrey",
    margin: 5,
  },
  songControlContainer: {
    flex: 2,
    ...divCenteredContent,
  },
  titleContainer: {
    flex: 1,
    ...divCenteredContent,
  },
  titleInput: {
    textAlign: "center",
    borderRadius: 3,
    border: "3px solid lightgrey",
  },
  tempoInput: {
    textAlign: "center",
    borderRadius: 3,
    border: "3px solid lightgrey",
    width: 50,
    margin: 5,
  },
  exportingModal: {
    ...divCenteredContent,
    width: "50%",
    alignSelf: "center",
    height: "100%",
    backgroundColor: "white",
    position: "absolute",
  },
};

export default connect(mapStateToProps, mapDispatchToProps)(TabCreator);
